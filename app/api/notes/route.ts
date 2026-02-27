import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get("search")
        const category = searchParams.get("category")

        let query = supabase
            .from("notes")
            .select("*")
            .eq("user_id", user.id)
            .order("is_pinned", { ascending: false })
            .order("updated_at", { ascending: false })

        // Apply search filter
        if (search) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
        }

        // Apply category filter
        if (category && category !== "all") {
            query = query.eq("category", category)
        }

        const { data: notes, error } = await query

        if (error) {
            console.error("Error fetching notes:", error)
            return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 })
        }

        return NextResponse.json({ notes })
    } catch (error) {
        console.error("Error in GET /api/notes:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

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
        const { title, content, category, is_pinned } = body

        if (!title || title.trim() === "") {
            return NextResponse.json({ error: "Title is required" }, { status: 400 })
        }

        const { data: note, error } = await supabase
            .from("notes")
            .insert({
                user_id: user.id,
                title: title.trim(),
                content: content || "",
                category: category || null,
                is_pinned: is_pinned || false,
            })
            .select()
            .single()

        if (error) {
            console.error("Error creating note:", error)
            return NextResponse.json({ error: "Failed to create note" }, { status: 500 })
        }

        return NextResponse.json({ note }, { status: 201 })
    } catch (error) {
        console.error("Error in POST /api/notes:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { id, title, content, category, is_pinned } = body

        if (!id) {
            return NextResponse.json({ error: "Note ID is required" }, { status: 400 })
        }

        if (!title || title.trim() === "") {
            return NextResponse.json({ error: "Title is required" }, { status: 400 })
        }

        const { data: note, error } = await supabase
            .from("notes")
            .update({
                title: title.trim(),
                content: content || "",
                category: category || null,
                is_pinned: is_pinned || false,
            })
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single()

        if (error) {
            console.error("Error updating note:", error)
            return NextResponse.json({ error: "Failed to update note" }, { status: 500 })
        }

        if (!note) {
            return NextResponse.json({ error: "Note not found" }, { status: 404 })
        }

        return NextResponse.json({ note })
    } catch (error) {
        console.error("Error in PUT /api/notes:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "Note ID is required" }, { status: 400 })
        }

        const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id)

        if (error) {
            console.error("Error deleting note:", error)
            return NextResponse.json({ error: "Failed to delete note" }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error in DELETE /api/notes:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
