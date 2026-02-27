import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await params

    // Use service role to bypass RLS — safe since we verify ownership below
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch course and verify ownership
    const { data: course, error: courseError } = await serviceClient
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Fetch modules, lessons, quizzes via service role
    const { data: modules } = await serviceClient.from("modules").select("*").eq("course_id", courseId).order("module_order")

    const { data: lessons } = await serviceClient
      .from("lessons")
      .select("*, module_id")
      .in("module_id", modules?.map((m: any) => m.id) || [])
      .order("lesson_order")

    const { data: quizzes } = await serviceClient.from("quiz_questions").select("*").eq("course_id", courseId)

    // User progress — use user's own client (RLS allows own records)
    const { data: progress } = await supabase
      .from("user_progress")
      .select("*")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .maybeSingle()

    return NextResponse.json(
      { course, modules, lessons, quizzes, progress },
      { status: 200 },
    )
  } catch (error) {
    console.error("[Course Detail Error]", error)
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await params
    const body = await req.json()

    // Verify ownership
    const { data: course, error: checkError } = await supabase
      .from("courses")
      .select("user_id")
      .eq("id", courseId)
      .single()

    if (checkError || course?.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update course
    const { error: updateError } = await supabase
      .from("courses")
      .update({
        title: body.title || undefined,
        description: body.description || undefined,
        status: body.status || undefined,
      })
      .eq("id", courseId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[Course Update Error]", error)
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await params

    // Verify ownership
    const { data: course, error: checkError } = await supabase
      .from("courses")
      .select("user_id")
      .eq("id", courseId)
      .single()

    if (checkError || course?.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete course (cascades)
    const { error: deleteError } = await supabase.from("courses").delete().eq("id", courseId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[Course Delete Error]", error)
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 })
  }
}
