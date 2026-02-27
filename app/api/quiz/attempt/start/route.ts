import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { lessonId, courseId, maxScore, proctoringEnabled } = body

        if (!lessonId || !courseId || !maxScore) {
            return NextResponse.json(
                { error: "Missing required fields: lessonId, courseId, maxScore" },
                { status: 400 }
            )
        }

        // Create quiz attempt
        const { data: attempt, error } = await supabase
            .from("quiz_attempts")
            .insert({
                user_id: user.id,
                lesson_id: lessonId,
                course_id: courseId,
                max_score: maxScore,
                proctoring_enabled: proctoringEnabled || false,
                started_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (error) {
            console.error("Error creating quiz attempt:", error)
            return NextResponse.json({ error: "Failed to create quiz attempt" }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            attemptId: attempt.id,
        })
    } catch (error) {
        console.error("Error in start quiz attempt API:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
