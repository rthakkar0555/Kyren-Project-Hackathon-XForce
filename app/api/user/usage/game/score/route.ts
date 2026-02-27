
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const DJANGO_API_URL = process.env.DJANGO_BACKEND_URL || "http://127.0.0.1:8000"

export async function POST(req: NextRequest) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()
        const res = await fetch(`${DJANGO_API_URL}/api/usage/game/score/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(body),
        })

        const data = await res.json()
        return NextResponse.json(data, { status: res.status })
    } catch (error) {
        return NextResponse.json({ error: "Backend error" }, { status: 500 })
    }
}
