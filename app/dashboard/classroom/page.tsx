import { getStudentClassrooms } from "@/app/actions/classroom"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Clock } from "lucide-react"
import Link from "next/link"
import { JoinClassroomBtn } from "@/components/student/join-classroom-btn"
import { AcceptInviteBtn } from "@/components/student/accept-invite-btn"

export default async function StudentClassroomPage() {
    const classrooms = await getStudentClassrooms()

    const invited = classrooms.filter((c: any) => c.status === 'invited')
    const enrolled = classrooms.filter((c: any) => c.status === 'enrolled')

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Classrooms</h1>
                    <p className="text-muted-foreground mt-1">
                        Access your assigned coursework and track your progress.
                    </p>
                </div>
                <JoinClassroomBtn />
            </div>

            {/* Pending Invites Section */}
            {invited.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                        <h2 className="text-lg font-semibold">Pending Invites ({invited.length})</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {invited.map((item: any) => (
                            <Card key={item.id} className="h-full border-l-4 border-l-yellow-500 flex flex-col justify-between bg-yellow-50/30 dark:bg-yellow-950/10">
                                <div>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="line-clamp-1">{item.classroomName}</CardTitle>
                                                <CardDescription className="line-clamp-1">
                                                    {item.classroomSection || "No Section"}
                                                </CardDescription>
                                            </div>
                                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                                Invited
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-2">
                                        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                            {item.classroomDesc || "No description provided."}
                                        </p>
                                        <div className="flex items-center gap-2 mt-4 text-sm font-medium">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-bold border">
                                                {item.teacherName?.[0] || "?"}
                                            </div>
                                            <span>{item.teacherName}</span>
                                        </div>
                                    </CardContent>
                                </div>
                                <CardFooter className="pt-4 border-t bg-muted/20">
                                    <AcceptInviteBtn
                                        classroomId={item.classroom_id}
                                        classroomName={item.classroomName}
                                    />
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Enrolled Classrooms */}
            {enrolled.length === 0 && invited.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">No classrooms found</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                        You haven't been added to any classrooms yet.
                        <br />
                        Join using a code or ask your teacher to invite you.
                    </p>
                    <JoinClassroomBtn />
                </div>
            ) : enrolled.length > 0 ? (
                <div className="space-y-4">
                    {invited.length > 0 && (
                        <h2 className="text-lg font-semibold">Enrolled Classrooms ({enrolled.length})</h2>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {enrolled.map((item: any) => (
                            <Card key={item.id} className="h-full hover:shadow-md transition-all border-l-4 border-l-primary flex flex-col justify-between">
                                <div>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="line-clamp-1">{item.classroomName}</CardTitle>
                                                <CardDescription className="line-clamp-1">
                                                    {item.classroomSection || "No Section"}
                                                </CardDescription>
                                            </div>
                                            <Badge variant="default">Enrolled</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-2">
                                        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                            {item.classroomDesc || "No description provided."}
                                        </p>
                                        <div className="flex items-center gap-2 mt-4 text-sm font-medium">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-bold border">
                                                {item.teacherName?.[0] || "?"}
                                            </div>
                                            <span>{item.teacherName}</span>
                                        </div>
                                    </CardContent>
                                </div>
                                <CardFooter className="pt-4 border-t bg-muted/20">
                                    <Button className="w-full gap-2" variant="secondary" asChild>
                                        <Link href={`/dashboard/classroom/${item.classroom_id}`}>
                                            <BookOpen className="h-4 w-4" />
                                            Go to Classroom
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    )
}
