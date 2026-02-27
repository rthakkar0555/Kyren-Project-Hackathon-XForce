import { getClassrooms } from "@/app/actions/classroom"
import { CreateClassroomBtn } from "@/components/teacher/create-classroom-btn"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, MoreVertical, Plus } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default async function TeacherDashboard() {
    const classrooms = await getClassrooms()

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Classrooms</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your classes, assignments, and student progress.
                    </p>
                </div>
                <CreateClassroomBtn />
            </div>

            {classrooms.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">No classrooms yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                        Create your first classroom to start inviting students.
                    </p>
                    <CreateClassroomBtn />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classrooms.map((classroom: any) => (
                        <Link
                            key={classroom.id}
                            href={`/dashboard/teacher/classroom/${classroom.id}`}
                            className="block group h-full"
                        >
                            <Card className="h-full hover:shadow-md transition-all border-l-4 border-l-primary cursor-pointer hover:border-primary/80">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="line-clamp-1">{classroom.name}</CardTitle>
                                            <CardDescription className="line-clamp-1">
                                                {classroom.section || "No Section"}
                                            </CardDescription>
                                        </div>
                                        {/* Placeholder for menu if needed */}
                                        {/* <MoreVertical className="h-4 w-4 text-muted-foreground" /> */}
                                    </div>
                                </CardHeader>
                                <CardContent className="pb-2">
                                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                        {classroom.description || "No description provided."}
                                    </p>
                                </CardContent>
                                <CardFooter className="pt-4 border-t bg-muted/20 flex justify-between items-center text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        <span>{classroom.studentCount || 0} Students</span>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {classroom.join_code}
                                    </Badge>
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
