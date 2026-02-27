import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { lessonId, videoId, videoTitle, watchPercentage } = body

        if (!lessonId || !videoId || !videoTitle) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        // Upsert video progress
        const { data, error } = await supabase
            .from("video_progress")
            .upsert(
                {
                    user_id: user.id,
                    lesson_id: lessonId,
                    video_id: videoId,
                    video_title: videoTitle,
                    watch_percentage: watchPercentage || 0,
                    is_completed: watchPercentage >= 90, // 90% threshold for completion
                    last_watched_at: new Date().toISOString(),
                },
                {
                    onConflict: "user_id,lesson_id,video_id",
                }
            )
            .select()
            .single()

        if (error) {
            console.error("Video progress error:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error("Video progress API error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const lessonId = searchParams.get("lessonId")

        if (!lessonId) {
            return NextResponse.json(
                { error: "Missing lessonId" },
                { status: 400 }
            )
        }

        // Get all video progress for this lesson
        const { data, error } = await supabase
            .from("video_progress")
            .select("*")
            .eq("user_id", user.id)
            .eq("lesson_id", lessonId)

        if (error) {
            console.error("Video progress fetch error:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ progress: data || [] })
    } catch (error) {
        console.error("Video progress API error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
