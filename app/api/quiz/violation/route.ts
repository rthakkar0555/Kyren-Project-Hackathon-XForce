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
        const { quizAttemptId, violationType, severity, evidence } = body

        if (!quizAttemptId || !violationType || !severity) {
            return NextResponse.json(
                { error: "Missing required fields: quizAttemptId, violationType, severity" },
                { status: 400 }
            )
        }

        // Log violation
        const { error } = await supabase
            .from("proctoring_violations")
            .insert({
                quiz_attempt_id: quizAttemptId,
                user_id: user.id,
                violation_type: violationType,
                severity,
                evidence_url: evidence,
                auto_flagged: true,
            })

        if (error) {
            console.error("Error logging violation:", error)
            return NextResponse.json({ error: "Failed to log violation" }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
        })
    } catch (error) {
        console.error("Error in violation API:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
