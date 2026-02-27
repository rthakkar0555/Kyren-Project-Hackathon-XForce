"use client"

import { useState } from "react"
import { Card, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChevronDown, ChevronUp, BookOpen, CheckCircle2, Clock, Youtube, HelpCircle, Award } from "lucide-react"
import Link from "next/link"
import CourseCompletionCard from "@/components/certificate/course-completion-card"

interface Module {
  id: string
  title: string
  description?: string
  estimated_hours?: number
}

interface Lesson {
  id: string
  module_id: string
  title: string
  estimated_minutes?: number
  youtube_suggestions?: any[]
}



interface CourseViewerProps {
  course: any
  modules: Module[]
  lessons: Lesson[]
  progress?: any
  userId?: string
  completedLessonIds?: string[]
  lessonProgress?: Record<string, { video: boolean; quiz: boolean }> // Granular progress type
  quizScores?: Record<string, number>
  userFullName?: string
  userPlan?: string
}

export default function CourseViewer({
  course,
  modules,
  lessons,
  progress,
  userId,
  completedLessonIds = [],
  lessonProgress = {}, // Default empty
  quizScores = {},
  userFullName = "Student",
  userPlan = "Normal User"
}: CourseViewerProps) {
  const [expandedModule, setExpandedModule] = useState<string | null>(modules[0]?.id || null)

  /* 
    Calculate Overall Course Completion Granularly 
    Total possible points = lessons * 2 (1 for video, 1 for quiz)
  */
  let totalCoursePoints = lessons.length * 2
  let earnedCoursePoints = 0

  lessons.forEach(l => {
    const p = lessonProgress[l.id] || { video: false, quiz: false }
    if (p.video) earnedCoursePoints += 1
    if (p.quiz) earnedCoursePoints += 1
  })

  // If no granular data exists yet, fall back to completedLessonIds * 2 (assuming full completion)
  // But actually, we prefer the granular calculation if lessonProgress is populated at all. 
  // If lessonProgress is empty but completedLessonIds has items, it might be legacy data.
  if (Object.keys(lessonProgress).length === 0 && completedLessonIds.length > 0) {
    earnedCoursePoints = completedLessonIds.length * 2
  }

  const completionPercentage = totalCoursePoints > 0
    ? Math.round((earnedCoursePoints / totalCoursePoints) * 100)
    : 0

  // Calculate total course hours from lessons
  const totalMinutes = lessons.reduce((sum, lesson) => sum + (lesson.estimated_minutes || 0), 0)
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10 // Round to 1 decimal place

  // Calculate Average Score based on ALL lessons (uncompleted = 0 or ignored? user said "pass all quiz")
  // We'll calculate average of *taken* quizzes, or overall?
  // "if user pass all quiz with 80%" implies 100% completion required.
  // We will divide total score by TOTAL lessons count effectively.
  const totalScore = Object.values(quizScores).reduce((a, b) => a + b, 0)
  const averageScore = lessons.length > 0 ? Math.round(totalScore / lessons.length) : 0

  const isCourseCompleted = completedLessonIds.length === lessons.length && lessons.length > 0
  const isEligibleForCertificate = isCourseCompleted && averageScore >= 80

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Certificate Section */}
      {isEligibleForCertificate ? (
        <CourseCompletionCard
          learnerName={userFullName}
          courseTitle={course.title}
          score={averageScore}
          status="Completed"
          certificateIssued={true}
          userPlan={userPlan}
        />
      ) : isCourseCompleted ? (
        <div className="relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-yellow-950/5 p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/30">
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Almost There!</h2>
            <p className="text-zinc-400 max-w-lg mx-auto">
              You've finished the course, but your average score is <span className="text-yellow-500 font-bold">{averageScore}%</span>.
              Retake quizzes to reach 80% and unlock your certificate.
            </p>
          </div>
        </div>
      ) : null}
      {/* Course Header */}
      <Card className="border-2 border-border">
        <CardHeader>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground mb-2">Course Overview</p>
              <p className="text-muted-foreground mb-4 break-words">{course.description}</p>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">Progress</p>
                  <Progress value={completionPercentage} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-1">{completionPercentage}% complete</p>
                </div>

                <div className="flex flex-wrap gap-4">
                  {course.learning_goals?.map((goal: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="border-border bg-card text-foreground whitespace-normal text-left">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-right">
              <Badge className="border-primary bg-primary text-primary-foreground block">
                {course.difficulty_level}
              </Badge>
              <p className="text-sm text-muted-foreground">{totalHours}h course</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Modules and Lessons */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold">Course Content</h2>

        {modules.map((module) => {
          const moduleLessons = lessons.filter((l) => l.module_id === module.id)
          const isExpanded = expandedModule === module.id

          // Calculate precise module completion
          // Each lesson has 2 parts: Video & Quiz. Total points = lessons * 2.
          const totalPoints = moduleLessons.length * 2
          let earnedPoints = 0

          moduleLessons.forEach(l => {
            const progress = lessonProgress[l.id] || { video: false, quiz: false }
            if (progress.video) earnedPoints += 1
            if (progress.quiz) earnedPoints += 1
          })

          const moduleCompletionPercentage = totalPoints > 0
            ? Math.round((earnedPoints / totalPoints) * 100)
            : 0

          const isModuleCompleted = moduleCompletionPercentage === 100

          return (
            <Card key={module.id} className={`border-2 ${isModuleCompleted ? 'border-green-500 bg-green-50/50' : 'border-border'}`}>
              <button
                onClick={() => setExpandedModule(isExpanded ? null : module.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  <BookOpen className={`h-6 w-6 flex-shrink-0 ${isModuleCompleted ? 'text-green-500' : 'text-primary'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg">{module.title}</h3>
                      {isModuleCompleted && (
                        <Badge className="bg-green-500 text-white border-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Module Completed
                        </Badge>
                      )}
                    </div>
                    {module.description && <p className="text-sm text-muted-foreground mt-1">{module.description}</p>}
                    {!isModuleCompleted && moduleLessons.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={moduleCompletionPercentage} className="h-1.5 flex-1 max-w-xs" />
                        <span className="text-xs text-muted-foreground font-medium">
                          {Math.round(moduleCompletionPercentage)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {(() => {
                      const minutes = moduleLessons.reduce((sum, l) => sum + (l.estimated_minutes || 0), 0)
                      return minutes >= 60 ? `${(minutes / 60).toFixed(1)}h` : `${minutes}m`
                    })()}
                  </Badge>
                  <Badge variant="outline">{moduleLessons.length} lessons</Badge>
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t-2 border-border p-6 space-y-3 bg-card/50">
                  {moduleLessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      href={`/dashboard/courses/${course.id}/lessons/${lesson.id}`}
                      className="block p-4 border-2 border-border hover:border-primary transition-all hover:bg-primary/5 group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold group-hover:text-primary transition-colors">{lesson.title}</h4>
                          <div className="flex items-center gap-3 mt-2">
                            {lesson.estimated_minutes && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {lesson.estimated_minutes} min
                              </p>
                            )}
                            {(lesson.youtube_suggestions && lesson.youtube_suggestions.length > 0) ? (
                              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                <Youtube className="h-3 w-3 mr-1 text-red-500" />
                                Video
                              </Badge>
                            ) : null}

                            {/* Quiz Status Badge */}
                            {quizScores[lesson.id] !== undefined ? (
                              <Badge variant="outline" className="text-xs h-5 px-1.5 bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Quiz Done ({quizScores[lesson.id]}%)
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                <HelpCircle className="h-3 w-3 mr-1 text-accent" />
                                Quiz
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Video Status */}
                          <div className={`flex items-center gap-1 text-xs ${lessonProgress[lesson.id]?.video ? 'text-green-600' : 'text-muted-foreground/30'}`} title="Video Completed">
                            <Youtube className="h-4 w-4" />
                            <CheckCircle2 className="h-3 w-3" />
                          </div>

                          {/* Quiz Status */}
                          <div className={`flex items-center gap-1 text-xs ${lessonProgress[lesson.id]?.quiz ? 'text-green-600' : 'text-muted-foreground/30'}`} title="Quiz Completed">
                            <HelpCircle className="h-4 w-4" />
                            <CheckCircle2 className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

    </div>
  )
}

