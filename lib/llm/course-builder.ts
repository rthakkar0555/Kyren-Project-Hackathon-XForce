import { getAdminClient } from "@/lib/supabase/server-admin"
import { expandLesson, generateQuizQuestions, suggestYouTubeVideos, generateWithFallback, generateCourseTitleFromVideos } from "./generator"
import type { CourseGenerationResult } from "@/lib/types"
import { logAPIUsage } from "@/lib/api-usage-tracker"
import { extractPlaylistId, getPlaylistVideos } from "@/lib/youtube"

export async function buildAndStoreCourse(
  userId: string,
  topic: string,
  difficulty: "beginner" | "intermediate" | "advanced" = "intermediate",
  numModules = 4,
  lessonsPerModule = 3,
  primaryProvider: "openai" | "gemini" = "openai",
  playlistUrl?: string,
): Promise<{ courseId: string; result: CourseGenerationResult }> {
  // Use Admin Client to bypass RLS policies for course generation
  const supabase = getAdminClient()

  try {
    // Step 1: Generate course outline with fallback
    let outline: any
    let provider = primaryProvider
    let retryCount = 0

    const playlistId = playlistUrl ? extractPlaylistId(playlistUrl) : null

    if (playlistId) {
      console.log(`[CourseBuilder] valid playlist ID found: ${playlistId}. Fetching videos...`)
      const videos = await getPlaylistVideos(playlistId)

      if (videos.length > 0) {
        console.log(`[CourseBuilder] found ${videos.length} videos in playlist`)

        // If topic is empty/generic, try to use channel or first video to infer context, or just keep it "Custom Course"
        const courseTitle = topic && topic.length > 2 ? topic : `Course from ${videos[0].channelTitle}`

        // Calculate modules
        // If user requested N modules, we try to distribute videos.
        // But if video count is small, we reduce modules.

        // Strategy: 
        // If videos < numModules, set numModules = videos.length (1 video per module? no, that's weird. maybe 1 module total)
        // Let's aim for 3-5 lessons per module.

        const effectiveLessonsPerModule = Math.ceil(videos.length / numModules)

        // Re-calculate numModules based on videos to avoid empty modules
        const effectiveNumModules = Math.ceil(videos.length / effectiveLessonsPerModule)

        outline = {
          courseTitle: courseTitle,
          courseDescription: `A comprehensive course based on the YouTube playlist by ${videos[0].channelTitle}.`,
          learningGoals: [`Master the concepts covered in the "${courseTitle}" playlist`, "Apply practical knowledge from video tutorials"],
          estimatedHours: Math.round(videos.length * 15 / 60), // assume 15 min per video rough avg
          modules: []
        }

        let videoIndex = 0;
        for (let i = 0; i < effectiveNumModules; i++) {
          if (videoIndex >= videos.length) break;

          const moduleVideos = videos.slice(videoIndex, videoIndex + effectiveLessonsPerModule)
          videoIndex += effectiveLessonsPerModule

          if (moduleVideos.length === 0) continue;

          outline.modules.push({
            title: `Module ${i + 1}: ${moduleVideos[0].title}`, // Use first video as generic topic for module
            description: "Core concepts covered in this section.",
            estimatedHours: Math.round(moduleVideos.length * 0.25),
            lessons: moduleVideos.map(v => ({
              title: v.title,
              content: v.description.slice(0, 500) || "Watch the video to learn more.", // Use description as base
              objectives: ["Understand the video content", "Apply key takeaways"],
              keyPoints: ["Key point 1", "Key point 2"],
              practicalTasks: ["Watch video carefully", "Take notes"],
              estimatedMinutes: 15,
              videoData: v // Pass strictly
            }))
          })
        }

        provider = "openai" // Default or purely deterministic
      } else {
        console.warn("[CourseBuilder] Playlist provided but no videos found. Falling back to LLM generation.")
      }
    }

    if (!outline) {
      const genResult = await generateWithFallback(
        topic,
        difficulty,
        numModules,
        lessonsPerModule,
        primaryProvider,
        userId, // Pass userId for tracking
      )
      outline = genResult.outline
      provider = genResult.provider
      retryCount = genResult.retryCount
    }

    // Step 2: Create course record
    console.log(`[CourseBuilder] Creating course record for topic: ${topic}`)
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .insert({
        user_id: userId,
        title: outline.courseTitle,
        description: outline.courseDescription,
        topic,
        difficulty_level: difficulty,
        learning_goals: outline.learningGoals,
        estimated_hours: outline.estimatedHours,
        status: "generated",
        course_metadata: { provider, retryCount },
      })
      .select()
      .single()

    if (courseError || !courseData) {
      throw new Error(`Failed to create course: ${courseError?.message}`)
    }

    const courseId = courseData.id

    // Step 3: Create modules and lessons
    console.log(`[CourseBuilder] Processing ${outline.modules.length} modules for course ${courseId}`)
    const modulesAndLessons: Array<{ module: any; lessons: any[] }> = []

    for (const moduleOutline of outline.modules) {
      console.log(`[CourseBuilder] Creating module: ${moduleOutline.title}`)
      const { data: moduleData, error: moduleError } = await supabase
        .from("modules")
        .insert({
          course_id: courseId,
          title: moduleOutline.title,
          description: moduleOutline.description,
          module_order: outline.modules.indexOf(moduleOutline),
          estimated_hours: moduleOutline.estimatedHours,
        })
        .select()
        .single()

      if (moduleError || !moduleData) {
        console.error(`[CourseBuilder] Failed to create module ${moduleOutline.title}:`, moduleError)
        continue
      }

      const lessons = []

      for (const lessonOutline of (moduleOutline.lessons || [])) {
        // Prepare content with fallback
        let expandedContent = lessonOutline.content || `Content for ${lessonOutline.title}`
        let quizQuestions: any[] = []
        let youtubeVideos: any[] = []

        // 1. Expand Content
        try {
          console.log(`[CourseBuilder] Expanding lesson: ${lessonOutline.title}`)
          const expanded = await expandLesson(lessonOutline.title, lessonOutline.content, provider as "openai" | "gemini", userId)
          expandedContent = expanded
        } catch (ex) {
          console.error(`[CourseBuilder] Failed to expand lesson content for ${lessonOutline.title}, using fallback.`, ex)
          // Keep original brief content
        }

        // 2. Generate Quiz
        try {
          quizQuestions = await generateQuizQuestions(lessonOutline.title, expandedContent, difficulty, provider as "openai" | "gemini", userId)
        } catch (ex) {
          console.error(`[CourseBuilder] Failed to generate quiz for ${lessonOutline.title}`, ex)
        }

        // 3. Suggest YouTube videos
        try {
          if ((lessonOutline as any).videoData) {
            // START: Playlist Override
            const v = (lessonOutline as any).videoData
            youtubeVideos = [{
              title: v.title,
              description: v.description,
              thumbnailUrl: v.thumbnailUrl,
              channelTitle: v.channelTitle,
              videoId: v.videoId,
              publishedAt: v.publishedAt
            }]
            // Calculate real duration if possible, otherwise keep default
            // END: Playlist Override
          } else {
            // Try to use real YouTube API first
            const { searchYouTubeVideos } = await import("@/lib/youtube")
            const realVideos = await searchYouTubeVideos(`${topic} ${lessonOutline.title}`, 4)
            if (realVideos.length > 0) {
              youtubeVideos = realVideos
            } else {
              // Fallback to LLM suggestions
              youtubeVideos = await suggestYouTubeVideos(topic, lessonOutline.title, provider as "openai" | "gemini")
            }
          }
        } catch (e) {
          console.warn("[CourseBuilder] YouTube search/suggestion failed:", e)
          // Try one last fallback to LLM if strict API search failed
          try {
            if (!(lessonOutline as any).videoData) {
              youtubeVideos = await suggestYouTubeVideos(topic, lessonOutline.title, provider as "openai" | "gemini")
            }
          } catch (ignore) { }
        }

        // 4. Insert Lesson
        try {
          const { data: lessonData, error: lessonError } = await supabase
            .from("lessons")
            .insert({
              module_id: moduleData.id,
              title: lessonOutline.title,
              content: expandedContent,
              lesson_order: moduleOutline.lessons.indexOf(lessonOutline),
              learning_objectives: lessonOutline.objectives || [],
              key_points: lessonOutline.keyPoints || [],
              practical_tasks: lessonOutline.practicalTasks || [],
              youtube_suggestions: youtubeVideos,
              estimated_minutes: lessonOutline.estimatedMinutes,
            })
            .select()
            .single()

          if (lessonError || !lessonData) {
            console.error(`[CourseBuilder] Failed to insert lesson ${lessonOutline.title}:`, lessonError)
            continue
          }

          // 5. Insert Quiz Questions
          if (quizQuestions.length > 0) {
            const questionsToInsert = quizQuestions.map((q: any) => ({
              lesson_id: lessonData.id,
              course_id: courseId,
              question_text: q.question_text || q.question,
              question_type: q.question_type || "mcq",
              options: q.options,
              correct_answer: q.correct_answer || q.answer,
              explanation: q.explanation,
              difficulty: q.difficulty || "medium",
            }))

            const { error: quizError } = await supabase.from("quiz_questions").insert(questionsToInsert)
            if (quizError) {
              console.error(`[CourseBuilder] Failed to insert quiz questions for ${lessonOutline.title}`, quizError)
            }
          }

          lessons.push(lessonData)

        } catch (insertEx) {
          console.error(`[CourseBuilder] Critical DB Error inserting lesson ${lessonOutline.title}:`, insertEx)
        }
      }

      modulesAndLessons.push({
        module: moduleData,
        lessons,
      })
    }

    // [NEW] Step 4: Calculate precise durations (Bottom-Up)
    // 1. Calculate and update module durations
    console.log(`[CourseBuilder] Calculating precise durations...`)
    let totalCourseMinutes = 0

    for (const item of modulesAndLessons) {
      const moduleMinutes = item.lessons.reduce((sum, l) => sum + (l.estimated_minutes || 0), 0)
      const moduleHours = Math.round((moduleMinutes / 60) * 10) / 10 // Round to 1 decimal

      if (moduleMinutes > 0) {
        // Update module in DB
        await supabase
          .from("modules")
          .update({ estimated_hours: moduleHours })
          .eq("id", item.module.id)

        // Update local object for result return
        item.module.estimated_hours = moduleHours
      }

      totalCourseMinutes += moduleMinutes
    }

    // 2. Calculate and update course duration
    const totalCourseHours = Math.round((totalCourseMinutes / 60) * 10) / 10
    if (totalCourseMinutes > 0) {
      await supabase
        .from("courses")
        .update({ estimated_hours: totalCourseHours })
        .eq("id", courseId)

      // Update local outline for result return
      outline.estimatedHours = totalCourseHours
    }

    // Step 5: Create user progress record
    const totalLessons = modulesAndLessons.reduce((sum, ml) => sum + ml.lessons.length, 0)
    console.log(`[CourseBuilder] Completed generation. Total lessons: ${totalLessons}`)

    await supabase.from("user_progress").insert({
      user_id: userId,
      course_id: courseId,
      total_lessons: totalLessons,
      completed_lessons: 0,
    })

    const result: CourseGenerationResult = {
      course: {
        title: outline.courseTitle,
        description: outline.courseDescription,
        topic,
        difficulty_level: difficulty,
        // ... (rest is same)

        learning_goals: outline.learningGoals,
        estimated_hours: outline.estimatedHours,
        status: "generated",
      },
      modules: modulesAndLessons.map((ml) => ({
        title: ml.module.title,
        description: ml.module.description,
        module_order: ml.module.module_order,
        estimated_hours: ml.module.estimated_hours,
      })),
      lessons: modulesAndLessons.flatMap((ml) =>
        ml.lessons.map((l) => ({
          title: l.title,
          content: l.content,
          lesson_order: l.lesson_order,
          learning_objectives: l.learning_objectives,
          key_points: l.key_points,
          practical_tasks: l.practical_tasks,
          youtube_suggestions: l.youtube_suggestions,
          estimated_minutes: l.estimated_minutes,
        })),
      ),
      quizzes: [],
    }

    return { courseId, result }
  } catch (error) {
    console.error("[Course Builder Error]", error)
    throw error
  }
}
