import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import CourseViewer from "@/components/course/course-viewer"
import { ArrowLeft } from "lucide-react"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) notFound()

  const { courseId } = await params

  // STEP 1: Check access via SECURITY DEFINER RPC (bypasses RLS, works for students)
  const { data: hasAccess, error: accessError } = await supabase.rpc('check_user_course_access', { p_course_id: courseId })

  if (accessError || !hasAccess) {
    console.log(`[CourseAccess] DENIED for user ${user.id}. Error:`, accessError)
    notFound()
  }

  // STEP 2: Use service role client to fetch course data (bypasses RLS entirely)
  // This is safe because we already verified access above via the RPC
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: course, error: courseError } = await serviceClient
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single()

  if (courseError || !course) {
    console.error("Course Fetch Error:", courseError)
    notFound()
  }

  const { data: modules } = await serviceClient
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("module_order")

  const { data: lessons } = await serviceClient
    .from("lessons")
    .select("*")
    .in("module_id", modules?.map((m) => m.id) || [])
    .order("lesson_order")

  // User progress — use user's own client (RLS allows own records)
  const { data: progress } = await supabase
    .from("user_progress")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", user?.id)
    .maybeSingle()

  // Extract detailed progress from user metadata
  const metadata = user?.user_metadata || {}
  const courseProgress = metadata.course_progress || {}
  const completedLessonIds = courseProgress[courseId] || []
  const lessonProgress = metadata.lesson_progress || {}
  const quizScores = metadata.quiz_scores?.[courseId] || {}
  const userFullName = user?.user_metadata?.full_name || user?.email?.split('@')[0]

  // Get user plan from metadata or email domain
  let userPlan = "Normal User"
  if (user?.email?.endsWith('.edu.in')) {
    userPlan = "Educational"
  } else if (metadata.subscription_plan) {
    userPlan = metadata.subscription_plan
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-4 border-border bg-card sticky top-0 z-40 shrink-0">
        <div className="p-6 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon" className="border-2 border-border bg-transparent shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold truncate">{course.title}</h1>
            <p className="text-muted-foreground truncate">{course.topic}</p>
          </div>
        </div>
      </div>

      <CourseViewer
        course={course}
        modules={modules || []}
        lessons={lessons || []}
        progress={progress}
        userId={user?.id}
        completedLessonIds={completedLessonIds}
        lessonProgress={lessonProgress}
        quizScores={quizScores}
        userFullName={userFullName}
        userPlan={userPlan}
      />
    </div>
  )
}
