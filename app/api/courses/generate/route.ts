import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildAndStoreCourse } from "@/lib/llm/course-builder"
import { logAPICall } from "@/lib/logger"
import { handleError, ValidationError } from "@/lib/error-handler"

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  let userId: string | undefined

  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = user.id

    // Ensure user exists in public.users to prevent FK constraints
    const { error: syncError } = await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email!, // Email is required for our schema
        full_name: user.user_metadata?.full_name || "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )

    if (syncError) {
      console.warn("Warning: Failed to sync user profile:", syncError)
      // Continue anyway as the user might already exist and it was just a permission/duplicate issue
    }

    // Parse request
    const body = await req.json()
    const {
      topic,
      difficulty = "intermediate",
      numModules = 5,
      lessonsPerModule = 4,
      llmProvider = "openai",
      playlistUrl
    } = body

    // Validate input
    if (!playlistUrl && (!topic || typeof topic !== "string" || topic.trim().length < 3)) {
      throw new ValidationError("Topic must be at least 3 characters long")
    }

    if (!["beginner", "intermediate", "advanced"].includes(difficulty)) {
      throw new ValidationError("Invalid difficulty level")
    }

    if (numModules < 1 || numModules > 12) { // Increased max
      throw new ValidationError("Number of modules must be between 1 and 12")
    }

    if (!["openai", "gemini"].includes(llmProvider)) {
      throw new ValidationError("Invalid LLM provider")
    }

    // [NEW] Check Limits Directly with Supabase
    // 1. Get user plan
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    // Query profiles table to get the true subscription plan that Stripe updates
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', userId)
      .single()

    let userPlan = "Normal User"
    if (currentUser?.email?.endsWith(".edu.in")) {
      userPlan = "Educational User"
    } else {
      const planFromDb = userProfile?.subscription_plan || currentUser?.user_metadata?.subscription_plan

      if (planFromDb === 'pro' || planFromDb === 'Pro User') {
        userPlan = "Pro User"
      } else if (planFromDb) {
        userPlan = planFromDb
      }
    }

    // 2. Count created courses
    const { count: coursesCreated, error: countError } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    if (countError) {
      console.error("Failed to count courses", countError)
      throw new Error("Failed to verify course limits")
    }

    // 3. Check Limit
    let maxCourses = 1
    if (userPlan === "Pro User") maxCourses = 9999
    if (userPlan === "Educational User") maxCourses = 12

    if ((coursesCreated || 0) >= maxCourses) {
      throw new ValidationError(`Course limit reached for ${userPlan}. Please upgrade to create more.`)
    }

    // Generate course
    const { courseId, result } = await buildAndStoreCourse(
      userId,
      topic.trim(),
      difficulty,
      numModules,
      lessonsPerModule,
      llmProvider,
      playlistUrl,
    )

    const responseTime = Date.now() - startTime

    // Log the API call
    await logAPICall({
      userId,
      endpoint: "/api/courses/generate",
      modelUsed: llmProvider,
      responseTimeMs: responseTime,
      statusCode: 201,
    })

    // [NEW] Track Usage in Django Backend
    // Skipping backend tracking as it is offline. Usage is calculated dynamically from DB.

    // [NEW] Extract & Persist Skills immediately
    try {
      const { extractSkillsFromCourses } = await import("@/lib/skill-extractor")
      // Synthesize a course object from the result
      const courseForExtraction = {
        title: result.course.title,
        topic: result.course.topic,
        description: result.course.description,
      }

      const extractedSkills = extractSkillsFromCourses([courseForExtraction])

      if (extractedSkills.length > 0) {
        const skillsToUpsert = extractedSkills.map(skill => ({
          user_id: userId,
          skill_name: skill.name,
          category: skill.category,
          proficiency_level: skill.level,
          source_courses_count: skill.count,
          last_detected_at: new Date().toISOString()
        }))

        await supabase.from("user_skills").upsert(skillsToUpsert, {
          onConflict: 'user_id, skill_name',
          ignoreDuplicates: false
        })
        console.log(`[SkillExtractor] Persisted ${extractedSkills.length} skills for user ${userId}`)
      }
    } catch (skillEx) {
      console.warn("[SkillExtractor] Failed to persist skills during generation:", skillEx)
      // Non-critical, continue
    }

    // [NEW] Send Notification Email
    try {
      const { sendCourseGeneratedEmail } = await import("@/lib/mail")
      // We must AWAIT this function. If we do not await it, the Next.js serverless 
      // function might terminate the process before the email actually fires off.
      await sendCourseGeneratedEmail(
        user.email!,
        user.user_metadata?.full_name || "Student",
        result.course.title,
        courseId
      )
    } catch (e) {
      console.error("Failed to trigger email notification:", e)
    }

    return NextResponse.json({ courseId, course: result }, { status: 201 })
  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorResponse = handleError(error)

    // Log error
    if (userId) {
      await logAPICall({
        userId,
        endpoint: "/api/courses/generate",
        modelUsed: "unknown",
        responseTimeMs: responseTime,
        statusCode: errorResponse.statusCode,
        errorMessage: errorResponse.message,
      })
    }

    return NextResponse.json(
      { error: errorResponse.message, code: errorResponse.code },
      { status: errorResponse.statusCode },
    )
  }
}
