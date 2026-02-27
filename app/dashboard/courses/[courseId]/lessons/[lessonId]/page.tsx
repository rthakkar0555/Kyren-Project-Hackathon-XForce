import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Clock, Target, CheckCircle2 } from "lucide-react"
import LessonContentWrapper from "@/components/lesson/lesson-content-wrapper"
import VideoPlayer from "@/components/lesson/video-player"
import SummaryTTS from "@/components/lessons/summary-tts"
import dynamic from "next/dynamic"

const LessonChatAssistant = dynamic(() => import("@/components/lesson/lesson-chat-assistant"), {
  ssr: false,
  loading: () => null
})

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) notFound()

  const { courseId, lessonId } = await params

  // STEP 1: Verify access via SECURITY DEFINER RPC
  const { data: hasAccess, error: accessError } = await supabase.rpc('check_user_course_access', { p_course_id: courseId })

  if (accessError || !hasAccess) {
    console.log(`[LessonAccess] DENIED for user ${user.id}`)
    notFound()
  }

  // STEP 2: Use service role client to bypass RLS for all course content
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Parallelize data fetching
  const [
    { data: course },
    { data: lesson, error: lessonError },
    { data: quizzes },
  ] = await Promise.all([
    serviceClient
      .from("courses")
      .select("id, title")
      .eq("id", courseId)
      .single(),

    serviceClient
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .single(),

    serviceClient
      .from("quiz_questions")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("id")
  ])

  if (!course || lessonError || !lesson) notFound()

  // Get module details & lessons (dependent on lesson module_id)
  const [
    { data: module },
    { data: moduleLessons }
  ] = await Promise.all([
    serviceClient.from("modules").select("id, title").eq("id", lesson.module_id).single(),
    serviceClient.from("lessons").select("id, title, lesson_order").eq("module_id", lesson.module_id).order("lesson_order")
  ])

  const currentIndex = moduleLessons?.findIndex((l) => l.id === lessonId) || 0
  const prevLesson = currentIndex > 0 ? moduleLessons![currentIndex - 1] : null
  const nextLesson = currentIndex < (moduleLessons?.length || 0) - 1 ? moduleLessons![currentIndex + 1] : null

  // Extract granular progress from user metadata
  const lessonProgress = user?.user_metadata?.lesson_progress || {}
  const currentLessonProgress = lessonProgress[lessonId] || { video: false, quiz: false }

  // Extract Score for this lesson
  const courseQuizScores = user?.user_metadata?.quiz_scores?.[courseId] || {}
  const lessonScore = courseQuizScores[lessonId] !== undefined ? courseQuizScores[lessonId] : null
  const isPassing = lessonScore !== null && lessonScore >= 80

  // Backwards compatibility: If score exists, consider quiz done.
  const isQuizDone = currentLessonProgress.quiz || lessonScore !== null

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb Navigation */}
      <div className="border-b-4 border-border bg-card sticky top-0 z-40">
        <div className="p-6 flex items-center gap-4">
          <Link href={`/dashboard/courses/${courseId}`}>
            <Button variant="outline" size="icon" className="border-2 border-border bg-transparent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">{module?.title}</p>
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-4xl mx-auto space-y-8">
        {/* Lesson Meta */}
        <div className="flex items-center gap-4 flex-wrap">
          {lesson.learning_objectives && lesson.learning_objectives.length > 0 && (
            <Badge className="border-primary bg-primary text-primary-foreground">
              <Target className="h-4 w-4 mr-2" />
              {lesson.learning_objectives.length} objectives
            </Badge>
          )}
          {lesson.estimated_minutes && (
            <Badge variant="outline" className="border-border">
              <Clock className="h-4 w-4 mr-2" />
              {lesson.estimated_minutes} min
            </Badge>
          )}
        </div>

        {/* YouTube Videos */}
        {lesson.youtube_suggestions && lesson.youtube_suggestions.length > 0 && (
          <VideoPlayer
            suggestions={lesson.youtube_suggestions}
            courseId={courseId}
            lessonId={lessonId}
            isCompleted={currentLessonProgress.video}
          />
        )}

        {/* Learning Objectives */}
        {lesson.learning_objectives && lesson.learning_objectives.length > 0 && (
          <div className="border-2 border-border p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-accent" />
              Learning Objectives
            </h2>
            <ul className="space-y-2">
              {lesson.learning_objectives.map((obj: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-primary font-bold mt-1">•</span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Points */}
        {lesson.key_points && lesson.key_points.length > 0 && (
          <div className="border-2 border-border p-6 space-y-4">
            <h2 className="text-xl font-bold">Key Concepts</h2>
            <ul className="space-y-2">
              {lesson.key_points.map((point: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 p-3 bg-muted/50 border-l-4 border-accent">
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Lesson Content with TTS */}
        <LessonContentWrapper lesson={lesson} />

        {/* Practical Tasks */}
        {lesson.practical_tasks && lesson.practical_tasks.length > 0 && (
          <div className="border-2 border-border p-6 space-y-4">
            <h2 className="text-xl font-bold">Practical Tasks</h2>
            <ol className="space-y-3">
              {lesson.practical_tasks.map((task: string, idx: number) => (
                <li key={idx} className="flex gap-4">
                  <span className="font-bold text-primary flex-shrink-0">{idx + 1}.</span>
                  <span>{task}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Quiz Section */}
        {quizzes && quizzes.length > 0 && (
          <div className={`border-2 p-8 rounded-lg flex flex-col items-center justify-center text-center space-y-4 shadow-sm transition-colors
            ${isQuizDone
              ? ((lessonScore !== null && lessonScore >= 80) ? 'border-green-500 bg-green-50 dark:bg-green-950/10' : 'border-red-500 bg-red-50 dark:bg-red-950/10')
              : 'border-border bg-card'}`}
          >
            {isQuizDone ? (
              (lessonScore !== null && lessonScore >= 80) ? (
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2 animate-in zoom-in">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              ) : (
                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-2 animate-in zoom-in">
                  <Target className="h-8 w-8 text-red-600" />
                </div>
              )
            ) : (
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Target className="h-8 w-8 text-primary" />
              </div>
            )}

            <h2 className={`text-2xl font-bold ${isQuizDone ? ((lessonScore !== null && lessonScore >= 80) ? 'text-green-800' : 'text-red-800') : ''}`}>
              {isQuizDone ? ((lessonScore !== null && lessonScore >= 80) ? "Quiz Passed!" : "Quiz Completed") : "Ready to take the Quiz?"}
            </h2>

            {isQuizDone && lessonScore !== null && (
              <div className="text-3xl font-black">
                <span className={(lessonScore >= 80) ? "text-green-600" : "text-red-600"}>{lessonScore}%</span>
              </div>
            )}

            {!isQuizDone && (
              <p className="text-muted-foreground max-w-md">
                Test your knowledge of this lesson. Strict AI proctoring will be enabled.
              </p>
            )}

            <div className="flex gap-4">
              {isQuizDone ? (
                <Button disabled variant="outline" size="lg" className={`px-8 font-bold text-lg opacity-100 cursor-not-allowed ${(lessonScore !== null && lessonScore >= 80) ? 'border-green-200 text-green-700 bg-white' : 'border-red-200 text-red-700 bg-white'}`}>
                  {(lessonScore !== null && lessonScore >= 80) ? "Score Recorded" : "Not Passed (No Retakes)"}
                </Button>
              ) : (
                <Link href={`/dashboard/courses/${courseId}/lessons/${lessonId}/quiz`}>
                  <Button size="lg" className="bg-primary text-primary-foreground px-8 font-bold text-lg border-2 border-primary hover:bg-primary/90">
                    Start Final Quiz <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-8 border-t-2 border-border">
          {prevLesson ? (
            <Link href={`/dashboard/courses/${courseId}/lessons/${moduleLessons![currentIndex - 1].id}`}>
              <Button variant="outline" className="border-2 border-border bg-transparent">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Previous Lesson
              </Button>
            </Link>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <Link href={`/dashboard/courses/${courseId}/lessons/${moduleLessons![currentIndex + 1].id}`}>
              <Button className="bg-primary text-primary-foreground border-2 border-primary">
                Next Lesson
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <Link href={`/dashboard/courses/${courseId}`}>
              <Button className="bg-accent text-accent-foreground border-2 border-accent">Back to Course</Button>
            </Link>
          )}
        </div>
      </div>

      {/* AI Teaching Assistant */}
      <LessonChatAssistant
        lessonTitle={lesson.title}
        lessonContext={{
          title: lesson.title,
          objectives: lesson.learning_objectives,
          keyPoints: lesson.key_points,
          content: lesson.content
        }}
      />
    </div>
  )
}
