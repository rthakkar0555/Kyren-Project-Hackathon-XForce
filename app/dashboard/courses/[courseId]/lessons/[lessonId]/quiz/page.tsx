import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { notFound, redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import QuizSection from "@/components/lesson/quiz-section"

export default async function QuizPage({
    params,
}: {
    params: Promise<{ courseId: string; lessonId: string }>
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    const { courseId, lessonId } = await params

    // STEP 1: Verify access via SECURITY DEFINER RPC (works for both teachers and students)
    const { data: hasAccess, error: accessError } = await supabase.rpc('check_user_course_access', { p_course_id: courseId })

    if (accessError || !hasAccess) {
        console.log(`[QuizAccess] DENIED for user ${user.id}`)
        notFound()
    }

    // STEP 2: Use service role client to bypass RLS for content fetching
    const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch lesson and quiz questions in parallel
    const [
        { data: lesson },
        { data: quizzes },
    ] = await Promise.all([
        serviceClient
            .from("lessons")
            .select("id, title, module_id")
            .eq("id", lessonId)
            .single(),

        serviceClient
            .from("quiz_questions")
            .select("*")
            .eq("lesson_id", lessonId)
            .order("id")
    ])

    if (!lesson) notFound()

    if (!quizzes || quizzes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold mb-4">No Quiz Available</h1>
                <Link href={`/dashboard/courses/${courseId}/lessons/${lessonId}`}>
                    <Button>Return to Lesson</Button>
                </Link>
            </div>
        )
    }

    // Get existing quiz score from user metadata
    const quizScores = user?.user_metadata?.quiz_scores?.[courseId] || {}
    const existingScore = quizScores[lessonId] !== undefined ? quizScores[lessonId] : null

    return (
        <div className="min-h-screen bg-background">
            {/* Simple Header */}
            <div className="border-b border-border bg-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/courses/${courseId}/lessons/${lessonId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Exit Quiz
                        </Button>
                    </Link>
                    <h1 className="font-bold text-lg">{lesson.title}: Final Assessment</h1>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto p-6 md:p-12">
                <QuizSection
                    quizzes={quizzes}
                    courseId={courseId}
                    lessonId={lessonId}
                    initialQuizScore={existingScore}
                />
            </div>
        </div>
    )
}
