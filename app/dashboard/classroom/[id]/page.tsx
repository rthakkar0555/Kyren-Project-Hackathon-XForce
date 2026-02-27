
import { getClassroomDetails, getClassroomCourses } from "@/app/actions/classroom"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { BookOpen, Clock, ChevronLeft, PlayCircle } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function StudentClassroomView({ params }: { params: { id: string } }) {
    const classroomId = params.id

    const [classroom, courses] = await Promise.all([
        getClassroomDetails(classroomId),
        getClassroomCourses(classroomId)
    ])

    if (!classroom) {
        redirect("/dashboard/classroom")
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="space-y-4">
                <Button variant="ghost" className="pl-0 gap-2" asChild>
                    <Link href="/dashboard/classroom">
                        <ChevronLeft className="h-4 w-4" /> Back to My Classrooms
                    </Link>
                </Button>
                <div className="border-b pb-6">
                    <h1 className="text-3xl font-bold tracking-tight">{classroom.name}</h1>
                    <p className="text-muted-foreground mt-1 text-lg">
                        {classroom.section && <span className="font-semibold text-foreground mr-2">{classroom.section}</span>}
                        {classroom.description}
                    </p>
                </div>
            </div>

            {/* Courses Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-bold tracking-tight">Assigned Courses</h2>
                </div>

                {courses.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
                        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">No courses assigned yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Your teacher hasn't assigned any courses to this classroom yet.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course: any) => (
                            <Card key={course.id} className="flex flex-col h-full hover:shadow-lg transition-all border-l-4 border-l-primary group">
                                <CardHeader>
                                    <div className="flex justify-between items-start gap-2">
                                        <Badge variant="outline" className="line-clamp-1">
                                            {course.topic}
                                        </Badge>
                                        <Badge className={
                                            course.difficulty === 'beginner' ? 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300' :
                                                course.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                    'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300'
                                        }>
                                            {course.difficulty}
                                        </Badge>
                                    </div>
                                    <CardTitle className="mt-2 line-clamp-2">{course.title}</CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {course.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        <span>{course.estimated_hours || "2"} hours</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0">
                                    <Button className="w-full gap-2 group-hover:bg-primary/90" asChild>
                                        <Link href={`/dashboard/courses/${course.course_id}`}>
                                            <PlayCircle className="w-4 h-4" />
                                            Start Course
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
