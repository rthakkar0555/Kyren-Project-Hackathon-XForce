import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart3, BookOpen, Layers, CheckCircle, Clock, GraduationCap, Video, Award, Target, Shield, AlertTriangle } from "lucide-react"
import { AnalyticsReportButton } from "@/components/analytics/analytics-report-button"

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <div>Please login</div>

  // Fetch all courses with related data
  const { data: courses, error } = await supabase
    .from("courses")
    .select(`
      *,
      modules(
        id,
        lessons(
          id,
          estimated_minutes,
          youtube_suggestions
        )
      )
    `)
    .eq("user_id", user.id)

  if (error) {
    console.error("Analytics Error:", error)
    return <div>Error loading data: {error.message}</div>
  }

  if (!courses) return <div>No data available</div>

  // Calculate comprehensive stats
  const totalCourses = courses.length

  // Count modules and lessons
  let totalModules = 0
  let totalLessons = 0
  let totalEstimatedMinutes = 0
  let totalVideos = 0

  courses.forEach(course => {
    const modules = course.modules as any[]
    if (Array.isArray(modules)) {
      totalModules += modules.length
      modules.forEach(module => {
        const lessons = module.lessons as any[]
        if (Array.isArray(lessons)) {
          totalLessons += lessons.length
          lessons.forEach(lesson => {
            totalEstimatedMinutes += lesson.estimated_minutes || 0
            if (lesson.youtube_suggestions && Array.isArray(lesson.youtube_suggestions)) {
              totalVideos += lesson.youtube_suggestions.length
            }
          })
        }
      })
    }
  })

  // Get quiz count
  const { count: quizCount } = await supabase
    .from("quiz_questions")
    .select("*", { count: 'exact', head: true })
    .in("lesson_id", courses.flatMap(c =>
      (c.modules as any[])?.flatMap(m =>
        (m.lessons as any[])?.map(l => l.id) || []
      ) || []
    ))

  // Get quiz attempts data
  const { data: quizAttempts } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", user.id)

  const totalQuizAttempts = quizAttempts?.length || 0
  const averageQuizScore = quizAttempts && quizAttempts.length > 0
    ? Math.round(quizAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / quizAttempts.length)
    : 0
  const averageTrustScore = quizAttempts && quizAttempts.length > 0
    ? Math.round(quizAttempts.reduce((sum, attempt) => sum + (attempt.trust_score || 100), 0) / quizAttempts.length)
    : 100

  // Get proctoring violations
  const { count: violationsCount } = await supabase
    .from("proctoring_violations")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", user.id)

  // Get quiz attempts with proctoring enabled
  const proctoredAttempts = quizAttempts?.filter(a => a.proctoring_enabled) || []
  const proctoredAttemptsCount = proctoredAttempts.length

  // Get user progress data
  const metadata = user.user_metadata || {}
  const rawCompletedLessons = Object.values(metadata.course_progress || {}).flat() as string[]

  // [NEW] Filter completed lessons to ONLY include those from currently active courses
  // This prevents counting progress from deleted courses
  const allActiveLessonIds = new Set(
    courses.flatMap(c =>
      (c.modules as any[])?.flatMap(m =>
        (m.lessons as any[])?.map(l => l.id) || []
      ) || []
    )
  )

  const allCompletedLessons = rawCompletedLessons.filter(id => allActiveLessonIds.has(id))

  const completedLessonsCount = allCompletedLessons.length
  const overallProgress = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0

  // Course status breakdown - Calculate based on actual completion
  const completedCourses = courses.filter(course => {
    const courseModules = course.modules as any[]
    if (!Array.isArray(courseModules) || courseModules.length === 0) return false

    const courseLessons = courseModules.flatMap(m => (m.lessons as any[]) || [])
    if (courseLessons.length === 0) return false

    const allLessonsCompleted = courseLessons.every(lesson =>
      allCompletedLessons.includes(lesson.id)
    )
    return allLessonsCompleted
  }).length

  const processingCourses = courses.filter(c => c.status === 'processing').length
  const generatedCourses = courses.filter(c => c.status === 'generated').length

  // Difficulty Distribution
  const beginnerCount = courses.filter(c => c.difficulty_level?.toLowerCase() === 'beginner').length
  const intermediateCount = courses.filter(c => c.difficulty_level?.toLowerCase() === 'intermediate').length
  const advancedCount = courses.filter(c => c.difficulty_level?.toLowerCase() === 'advanced').length

  const difficultyStats = [
    { label: "Beginner", count: beginnerCount, color: "bg-green-500" },
    { label: "Intermediate", count: intermediateCount, color: "bg-blue-500" },
    { label: "Advanced", count: advancedCount, color: "bg-red-500" }
  ]

  // Calculate estimated learning hours (based on COMPLETED lessons)
  const completedLessonsMinutes = courses.flatMap(c =>
    (c.modules as any[])?.flatMap(m =>
      (m.lessons as any[])?.filter(l => allCompletedLessons.includes(l.id)) || []
    ) || []
  ).reduce((sum, l) => sum + (l.estimated_minutes || 0), 0)

  const completedHours = Math.round(completedLessonsMinutes / 60)

  // [NEW] Smart Data Processing for Analytics Report
  // 1. Deduplicate courses (keep latest by created_at)
  const uniqueCoursesMap = new Map()
  courses.forEach(c => {
    if (!uniqueCoursesMap.has(c.title) || new Date(c.created_at) > new Date(uniqueCoursesMap.get(c.title).created_at)) {
      uniqueCoursesMap.set(c.title, c)
    }
  })
  const uniqueCourses = Array.from(uniqueCoursesMap.values())

  // 2. Calculate Per-Course Metric
  const courseMetrics = uniqueCourses.map(course => {
    const modules = course.modules as any[] || []
    const lessons = modules.flatMap(m => m.lessons as any[] || [])
    const totalCourseLessons = lessons.length
    const completedCourseLessons = lessons.filter(l => allCompletedLessons.includes(l.id)).length
    const progress = totalCourseLessons > 0 ? Math.round((completedCourseLessons / totalCourseLessons) * 100) : 0

    // Calculate course-specific quiz score
    const courseLessonIds = new Set(lessons.map(l => l.id))
    const courseAttempts = quizAttempts?.filter(a =>
      // check if attempt matches any lesson in this course (this requires joining, but we approximate by date or assume global avg if tricky)
      // actually we can match by lesson_id if available in attempts, assuming we fetch it.
      // logic simplification: we'll use global avg for now or refine data fetching later.
      // For now, let's use global avg score as placeholder for per-course to avoid complex joins not present
      true
    ) || []

    return {
      id: course.id,
      title: course.title,
      totalLessons: totalCourseLessons,
      completedLessons: completedCourseLessons,
      progress,
      status: progress === 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started',
      lastActive: new Date(course.created_at).toLocaleDateString(), // Placeholder for real activity log
      difficulty: course.difficulty_level || 'N/A'
    }
  })

  // 3. Identify Insights
  const startedCourses = courseMetrics.filter(c => c.progress > 0 && c.progress < 100)
  const strongestCourse = courseMetrics.reduce((prev, current) => (prev.progress > current.progress) ? prev : current, courseMetrics[0])

  // 4. Detailed "Drop Off" logic check
  // (avg completion % of started courses)
  const avgCompletionOfStarted = startedCourses.length > 0
    ? Math.round(startedCourses.reduce((acc, c) => acc + c.progress, 0) / startedCourses.length)
    : 0

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tighter">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Real-time insights into your learning journey</p>
        </div>
        <AnalyticsReportButton
          userName={user.user_metadata?.full_name || user.email || 'Learner'}
          stats={{
            totalCourses: uniqueCourses.length,
            totalModules,
            totalLessons,
            completedCourses,
            completedLessons: completedLessonsCount,
            overallProgress,
            completedHours,
            averageQuizScore: totalQuizAttempts > 0 ? averageQuizScore : -1, // -1 indicates N/A
            averageTrustScore,
            violationsCount: violationsCount || 0,
            totalVideos,
            quizCount: quizCount || 0
          }}
          courses={courseMetrics}
          insights={{
            strongestTopic: strongestCourse?.title || "General Learning",
            avgCompletionOfStarted,
            totalCertificates: completedCourses // Assuming 1 course = 1 cert
          }}
        />
      </div>

      {/* Primary KPI Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {generatedCourses} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Modules</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalModules}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalLessons} lessons
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Progress</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overallProgress}%</div>
            <Progress value={overallProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedHours}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedLessonsMinutes} minutes completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCourses}</div>
            <p className="text-xs text-muted-foreground">courses finished</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lessons Done</CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedLessonsCount}</div>
            <p className="text-xs text-muted-foreground">of {totalLessons} total</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Video Resources</CardTitle>
            <Video className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVideos}</div>
            <p className="text-xs text-muted-foreground">recommended videos</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz Questions</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quizCount || 0}</div>
            <p className="text-xs text-muted-foreground">total assessments</p>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Performance Section */}
      {totalQuizAttempts > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tighter">Quiz Performance</h2>
            <p className="text-muted-foreground">Your assessment results and proctoring analytics</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
                <Target className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalQuizAttempts}</div>
                <p className="text-xs text-muted-foreground">{proctoredAttemptsCount} proctored</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <Award className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${averageQuizScore >= 80 ? 'text-green-600' : averageQuizScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {averageQuizScore}%
                </div>
                <Progress value={averageQuizScore} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
                <Shield className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${averageTrustScore >= 80 ? 'text-green-600' : averageTrustScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {averageTrustScore}%
                </div>
                <p className="text-xs text-muted-foreground">avg proctoring score</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Violations</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${violationsCount === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {violationsCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">proctoring flags</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Detailed Analytics */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Difficulty Distribution */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Difficulty Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {difficultyStats.map(stat => (
              <div key={stat.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{stat.label}</span>
                  <span className="font-bold">{stat.count} courses</span>
                </div>
                <Progress
                  value={totalCourses > 0 ? (stat.count / totalCourses) * 100 : 0}
                  className="h-2"
                  indicatorColor={stat.color}
                />
              </div>
            ))}
            {totalCourses === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No courses yet. Create your first course to see stats!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courses.slice(0, 5).map((course: any, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{course.title || 'Course Generated'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(course.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className={`text-xs px-3 py-1 rounded-full font-medium ${course.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : course.status === 'generated'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {course.status}
                  </div>
                </div>
              ))}
              {courses.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No activity yet. Start by creating a course!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
