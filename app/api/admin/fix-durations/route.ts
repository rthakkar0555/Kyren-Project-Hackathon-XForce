import { type NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/server-admin"

export async function GET(req: NextRequest) {
    const supabase = getAdminClient()
    const results = []

    try {
        // 1. Get all courses
        const { data: courses, error: coursesError } = await supabase
            .from("courses")
            .select("id, title, estimated_hours")

        if (coursesError) throw coursesError

        // 2. Process each course
        for (const course of courses) {
            // Get all modules -> lessons for this course
            const { data: modules, error: modulesError } = await supabase
                .from("modules")
                .select(`
          id,
          lessons (
            id,
            estimated_minutes
          )
        `)
                .eq("course_id", course.id)

            if (modulesError) {
                results.push({ course: course.title, error: modulesError.message })
                continue
            }

            // Calculate total minutes
            let totalMinutes = 0

            // Also calculate module durations to fix them too
            for (const module of modules) {
                const lessons = module.lessons as any[] || []
                const moduleMinutes = lessons.reduce((sum, l) => sum + (l.estimated_minutes || 0), 0)
                totalMinutes += moduleMinutes

                // Fix module duration
                const moduleHours = Math.round((moduleMinutes / 60) * 10) / 10
                await supabase
                    .from("modules")
                    .update({ estimated_hours: moduleHours })
                    .eq("id", module.id)
            }

            // Calculate new course duration
            const newEstimatedHours = Math.round((totalMinutes / 60) * 10) / 10

            // Update if different
            if (course.estimated_hours !== newEstimatedHours) {
                await supabase
                    .from("courses")
                    .update({ estimated_hours: newEstimatedHours })
                    .eq("id", course.id)

                results.push({
                    course: course.title,
                    old_hours: course.estimated_hours,
                    new_hours: newEstimatedHours,
                    status: "UPDATED"
                })
            } else {
                results.push({
                    course: course.title,
                    hours: course.estimated_hours,
                    status: "MATCHED"
                })
            }
        }

        return NextResponse.json({ success: true, updates: results })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
