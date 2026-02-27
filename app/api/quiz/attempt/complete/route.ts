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
        const { attemptId, score, trustScore } = body

        if (!attemptId || score === undefined) {
            return NextResponse.json(
                { error: "Missing required fields: attemptId, score" },
                { status: 400 }
            )
        }

        // Complete quiz attempt
        const { error } = await supabase
            .from("quiz_attempts")
            .update({
                completed_at: new Date().toISOString(),
                score,
                trust_score: trustScore || 100,
            })
            .eq("id", attemptId)
            .eq("user_id", user.id)

        if (error) {
            console.error("Error completing quiz attempt:", error)
            return NextResponse.json({ error: "Failed to complete quiz attempt" }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
        })
    } catch (error) {
        console.error("Error in complete quiz attempt API:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
