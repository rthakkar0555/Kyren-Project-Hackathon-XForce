import {
    getClassroomDetails,
    getClassroomStudents,
    getClassroomCourses,
    getTeacherCourses,
    getClassroomAnalytics,
    getClassroomCourseStats
} from "@/app/actions/classroom"
import { InviteStudentModal } from "@/components/teacher/invite-student-modal"
import { AssignCourseModal } from "@/components/teacher/assign-course-modal"
import { UnassignCourseButton } from "@/components/teacher/unassign-course-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { redirect } from "next/navigation"
import { Users, BookOpen, BarChart3, Clock, CheckCircle2, ChevronLeft, TrendingUp, Award, Activity } from "lucide-react"
import Link from "next/link"

export default async function ClassroomDetailsPage({ params }: { params: { id: string } }) {
    const classroomId = params.id

    const [classroom, students, assignedCourses, teacherCourses, analyticsData, courseStats] = await Promise.all([
        getClassroomDetails(classroomId),
        getClassroomStudents(classroomId),
        getClassroomCourses(classroomId),
        getTeacherCourses(),
        getClassroomAnalytics(classroomId),
        getClassroomCourseStats(classroomId)
    ])

    if (!classroom) {
        redirect("/dashboard/teacher")
    }

    // Build a map of courseId -> stats for quick lookup
    const statsMap = new Map<string, any>()
    courseStats.forEach((s: any) => statsMap.set(s.course_id, s))

    // Overall classroom stats
    const enrolledCount = students.filter((s: any) => s.status === 'enrolled' || s.status === 'joined').length
    const totalStudents = students.length

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="space-y-4">
                <Button variant="ghost" className="pl-0 gap-2" asChild>
                    <Link href="/dashboard/teacher">
                        <ChevronLeft className="h-4 w-4" /> Back to Classrooms
                    </Link>
                </Button>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{classroom.name}</h1>
                        <p className="text-muted-foreground mt-1 text-lg">
                            {classroom.section && <span className="font-semibold text-foreground mr-2">{classroom.section}</span>}
                            {classroom.description}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-sm font-medium text-muted-foreground">Join Code</div>
                        <div className="text-3xl font-mono font-bold tracking-widest bg-muted px-4 py-2 rounded-md border-2 border-dashed border-primary/20 select-all">
                            {classroom.join_code}
                        </div>
                    </div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{enrolledCount}</div>
                                <div className="text-xs text-muted-foreground">Enrolled</div>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{assignedCourses.length}</div>
                                <div className="text-xs text-muted-foreground">Courses</div>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {analyticsData.length > 0
                                        ? Math.round(
                                            analyticsData.reduce((sum: number, s: any) => {
                                                const avg = s.progress.length > 0
                                                    ? s.progress.reduce((a: number, p: any) => a + (p.percentage || 0), 0) / s.progress.length
                                                    : 0
                                                return sum + avg
                                            }, 0) / analyticsData.length
                                        )
                                        : 0}%
                                </div>
                                <div className="text-xs text-muted-foreground">Avg Progress</div>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                <Award className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {analyticsData.length > 0
                                        ? Math.round(
                                            analyticsData.reduce((sum: number, s: any) => {
                                                const scores = s.progress.filter((p: any) => p.avgQuizScore > 0)
                                                if (scores.length === 0) return sum
                                                return sum + scores.reduce((a: number, p: any) => a + p.avgQuizScore, 0) / scores.length
                                            }, 0) / Math.max(analyticsData.filter((s: any) => s.progress.some((p: any) => p.avgQuizScore > 0)).length, 1)
                                        )
                                        : 0}%
                                </div>
                                <div className="text-xs text-muted-foreground">Avg Quiz Score</div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="students" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="students" className="gap-2">
                        <Users className="h-4 w-4" /> Students
                    </TabsTrigger>
                    <TabsTrigger value="courses" className="gap-2">
                        <BookOpen className="h-4 w-4" /> Courses
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-2">
                        <BarChart3 className="h-4 w-4" /> Analytics
                    </TabsTrigger>
                </TabsList>

                {/* --- STUDENTS TAB --- */}
                <TabsContent value="students" className="space-y-6">
                    <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                        <div>
                            <h3 className="font-semibold text-lg">Students</h3>
                            <p className="text-sm text-muted-foreground">
                                {enrolledCount} enrolled · {totalStudents - enrolledCount} invited
                            </p>
                        </div>
                        <InviteStudentModal classroomId={classroomId} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {students.map((student: any) => (
                            <Card key={student.id} className="flex flex-row items-center gap-4 p-4">
                                <Avatar className="h-12 w-12 border">
                                    <AvatarImage src={student.avatarUrl} />
                                    <AvatarFallback>{student.name?.[0]?.toUpperCase() || student.email?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="overflow-hidden flex-1">
                                    <div className="font-semibold truncate">{student.name || "—"}</div>
                                    <div className="text-xs text-muted-foreground truncate">{student.email}</div>
                                    <div className="mt-2">
                                        <Badge
                                            variant={student.status === 'enrolled' || student.status === 'joined' ? "default" : "secondary"}
                                            className="text-[10px] h-5 px-1.5"
                                        >
                                            {student.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                            </Card>
                        ))}
                        {students.length === 0 && (
                            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                                No students yet. Invite them to get started!
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* --- COURSES TAB --- */}
                <TabsContent value="courses" className="space-y-6">
                    <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                        <div>
                            <h3 className="font-semibold text-lg">Assigned Courses</h3>
                            <p className="text-sm text-muted-foreground">
                                Courses available to students in this class
                            </p>
                        </div>
                        <AssignCourseModal
                            classroomId={classroomId}
                            availableCourses={teacherCourses}
                        />
                    </div>

                    <div className="space-y-4">
                        {assignedCourses.map((item: any) => {
                            const stats = statsMap.get(item.course_id)
                            const avgPct = stats?.avg_completion_pct ?? 0
                            const completedCount = stats?.completed_count ?? 0
                            const startedCount = stats?.started_count ?? 0

                            return (
                                <Card key={item.id} className="overflow-hidden">
                                    <div className="flex flex-col md:flex-row md:items-center">
                                        <div className="p-6 flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline">{item.topic}</Badge>
                                                <Badge className={
                                                    item.difficulty === 'beginner' ? 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300' :
                                                        item.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                            'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300'
                                                }>
                                                    {item.difficulty}
                                                </Badge>
                                            </div>
                                            <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                                            <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                                                {item.description || "No description."}
                                            </p>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    <span>Assigned {new Date(item.assigned_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Activity className="h-4 w-4" />
                                                    <span>{startedCount} started · {completedCount} completed</span>
                                                </div>
                                            </div>
                                            {/* Class completion progress bar */}
                                            <div className="mt-4 space-y-1">
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>Class Avg. Completion</span>
                                                    <span className="font-mono font-semibold">{avgPct}%</span>
                                                </div>
                                                <Progress value={Number(avgPct)} className="h-2" />
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="bg-muted/30 p-6 md:w-52 border-t md:border-t-0 md:border-l flex flex-col justify-center gap-2">
                                            <UnassignCourseButton
                                                classroomId={classroomId}
                                                courseId={item.course_id}
                                                courseTitle={item.title}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                        {assignedCourses.length === 0 && (
                            <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                                No courses assigned. Assign a course to start teaching!
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* --- ANALYTICS TAB --- */}
                <TabsContent value="analytics" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-primary" />
                                Student Progress Analytics
                            </CardTitle>
                            <CardDescription>
                                Real-time lesson completion and quiz scores for {classroom.name}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {analyticsData.length === 0 ? (
                                <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20 gap-3">
                                    <BarChart3 className="h-10 w-10 opacity-30" />
                                    <div className="text-center">
                                        <p className="font-medium">No data yet</p>
                                        <p className="text-sm">Invite students and assign courses to see progress here.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Student</th>
                                                {analyticsData[0]?.progress.map((c: any) => (
                                                    <th key={c.courseId} className="px-4 py-3 font-medium whitespace-nowrap min-w-[180px]">
                                                        <div>{c.courseTitle}</div>
                                                        <div className="text-[10px] font-normal text-muted-foreground/70 normal-case">Progress · Quiz Score</div>
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3 font-medium whitespace-nowrap">Last Active</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsData.map((student: any) => {
                                                // Find the most recent lastActive across all courses
                                                const lastActive = student.progress
                                                    .map((p: any) => p.lastActive)
                                                    .filter(Boolean)
                                                    .sort()
                                                    .at(-1)

                                                return (
                                                    <tr key={student.studentId} className="border-b last:border-0 hover:bg-muted/50">
                                                        <td className="px-4 py-4 font-medium">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border border-primary/20 shrink-0">
                                                                    {student.name?.[0]?.toUpperCase() || "?"}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold">{student.name}</span>
                                                                    <span className="text-xs text-muted-foreground font-normal">{student.email}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {student.progress.map((p: any) => (
                                                            <td key={p.courseId} className="px-4 py-4">
                                                                <div className="space-y-2 min-w-[160px]">
                                                                    {/* Lesson progress bar */}
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                                                                            <div
                                                                                className={`h-2 rounded-full transition-all ${p.percentage >= 100 ? 'bg-green-500' : p.percentage > 0 ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                                                                                style={{ width: `${p.percentage || 0}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className="text-xs font-mono w-9 text-right">
                                                                            {p.percentage}%
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                                        <span>{p.completed}/{p.total} lessons</span>
                                                                        {/* Quiz score badge */}
                                                                        {p.avgQuizScore > 0 ? (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={`text-[10px] h-4 px-1.5 ${p.avgQuizScore >= 80
                                                                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
                                                                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400'
                                                                                    }`}
                                                                            >
                                                                                Quiz: {p.avgQuizScore}%
                                                                            </Badge>
                                                                        ) : (
                                                                            <span className="text-[10px] text-muted-foreground/50">No quiz yet</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        ))}
                                                        <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">
                                                            {lastActive
                                                                ? new Date(lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                                : <span className="text-muted-foreground/40">Not started</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
