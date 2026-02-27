import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Clock } from "lucide-react"

interface CourseCardProps {
  course: {
    id: string
    title: string
    description?: string
    topic: string
    difficulty_level: string
    status: string
    estimated_hours?: number
  }
}

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <Link href={`/dashboard/courses/${course.id}`}>
      <Card className="border-2 border-border hover:border-primary transition-all cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl line-clamp-2">{course.title}</CardTitle>
              <CardDescription className="mt-1">{course.topic}</CardDescription>
            </div>
            <Badge
              className={`font-bold px-3 py-1 whitespace-nowrap border-2 ${
                course.difficulty_level === "beginner"
                  ? "border-secondary bg-secondary text-secondary-foreground"
                  : course.difficulty_level === "intermediate"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-accent bg-accent text-accent-foreground"
              }`}
            >
              {course.difficulty_level}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {course.description && <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>}

            <div className="flex items-center gap-6 text-sm">
              {course.estimated_hours && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{course.estimated_hours}h</span>
                </div>
              )}
              <Badge variant="outline" className="border-border ml-auto">
                {course.status}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-primary font-semibold group">
              View Course
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
