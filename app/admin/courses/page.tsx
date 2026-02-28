import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function CoursesPage() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, topic, difficulty_level, status, created_at")
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-border bg-card">
        <div className="p-8 max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="icon" className="border-2 border-border bg-transparent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Courses</h1>
            <p className="text-muted-foreground">{courses?.length || 0} total courses</p>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle>Course List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-border">
                  <tr>
                    <th className="text-left p-4 font-bold">Title</th>
                    <th className="text-left p-4 font-bold">Topic</th>
                    <th className="text-left p-4 font-bold">Difficulty</th>
                    <th className="text-left p-4 font-bold">Status</th>
                    <th className="text-left p-4 font-bold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-border">
                  {courses?.map((course: any) => (
                    <tr key={course.id} className="hover:bg-muted/50">
                      <td className="p-4 font-semibold">{course.title}</td>
                      <td className="p-4">{course.topic}</td>
                      <td className="p-4">
                        <Badge
                          className={`border-2 ${
                            course.difficulty_level === "beginner"
                              ? "bg-secondary text-secondary-foreground border-secondary"
                              : course.difficulty_level === "intermediate"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-accent text-accent-foreground border-accent"
                          }`}
                        >
                          {course.difficulty_level}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="border-border capitalize">
                          {course.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{new Date(course.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
