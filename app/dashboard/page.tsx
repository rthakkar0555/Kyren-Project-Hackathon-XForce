import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import CourseCard from "@/components/dashboard/course-card"
import { UsageStats } from "@/components/usage-stats"
import { Plus, BookOpen } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Use service role to bypass any RLS issues — we filter by user_id explicitly
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: courses, error } = await serviceClient
    .from("courses")
    .select("id, title, description, topic, difficulty_level, status, created_at, estimated_hours")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[Dashboard] Failed to load courses:", error)
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter">Your Courses</h1>
          <p className="text-muted-foreground mt-2">Create and manage your AI-generated courses</p>
        </div>
        <Link href="/dashboard/create">
          <Button className="bg-primary text-primary-foreground border-2 border-primary px-8 py-6 text-base font-bold">
            <Plus className="mr-2 h-5 w-5" />
            New Course
          </Button>
        </Link>
      </div>

      <UsageStats />

      {courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: any) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="border-4 border-dashed border-border p-12 text-center space-y-4">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
          <h3 className="text-xl font-bold">No courses yet</h3>
          <p className="text-muted-foreground">Create your first course to get started</p>
          <Link href="/dashboard/create">
            <Button className="bg-primary text-primary-foreground border-2 border-primary mt-4">Create Course</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
