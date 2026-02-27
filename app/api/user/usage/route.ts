import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Use service role to bypass any RLS issues
        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Fetch profile for subscription plan
        const { data: profile } = await serviceClient
            .from('profiles')
            .select('subscription_plan')
            .eq('id', user.id)
            .maybeSingle()

        // Determine user plan
        let userPlan = "Normal User"
        if (user?.email?.endsWith(".edu.in")) {
            userPlan = "Educational User"
        } else {
            const rawPlan = profile?.subscription_plan || user?.user_metadata?.subscription_plan || "Normal User"
            userPlan = rawPlan
        }

        // Count courses created by this user
        const { count: coursesCreated } = await serviceClient
            .from("courses")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)

        // Define limits based on plan
        let maxCourses = 1
        if (userPlan === "pro" || userPlan === "Pro User") {
            userPlan = "Pro User"
            maxCourses = 9999
        }
        if (userPlan === "Educational User") maxCourses = 12

        return NextResponse.json({
            plan_name: userPlan,
            courses_created: coursesCreated || 0,
            max_courses: maxCourses
        })
    } catch (error) {
        console.error("Usage Check Error", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
