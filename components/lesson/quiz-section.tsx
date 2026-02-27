"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, XCircle, Lightbulb, AlertTriangle, Lock, Shield, Timer } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import ProctoringSetup from "./proctoring-setup"
import ProctoringMonitor from "./proctoring-monitor"

interface QuizQuestion {
  id: string
  question_text: string
  question_type: "mcq" | "descriptive" | "code"
  options?: Record<string, any>
  correct_answer?: string
  explanation?: string
  difficulty: string
  rubric?: { keyPoints: string[]; maxPoints: number }
  keywords?: string[]
  max_points?: number
}

interface QuizSectionProps {
  quizzes: QuizQuestion[]
  courseId: string
  lessonId: string
  initialQuizScore?: number | null
}

interface ViolationData {
  type: "multiple_faces" | "no_face" | "looking_away" | "audio_detected" | "tab_switch" | "phone_detected" | "face_movement" | "suspicious_eye_movement"
  severity: "low" | "medium" | "high" | "critical"
  timestamp: Date
  evidence?: string
}

export default function QuizSection({ quizzes, courseId, lessonId, initialQuizScore }: QuizSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hasCheated, setHasCheated] = useState(false)
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(initialQuizScore !== null && initialQuizScore !== undefined)

  // Proctoring states
  const [showProctoringSetup, setShowProctoringSetup] = useState(false)
  const [proctoringActive, setProctoringActive] = useState(false)
  const [trustScore, setTrustScore] = useState(100)
  const [violations, setViolations] = useState<ViolationData[]>([])
  const [quizAttemptId, setQuizAttemptId] = useState<string | null>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [terminationReason, setTerminationReason] = useState<string | null>(null)

  // Timer state (15 minutes)
  const [timeLeft, setTimeLeft] = useState(15 * 60)

  // Timer countdown
  useEffect(() => {
    if (!quizStarted || submitted || showResults) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [quizStarted, submitted, showResults])

  // Auto-submit on time up
  useEffect(() => {
    if (timeLeft === 0 && !submitted && !showResults) {
      handleSubmit(false)
    }
  }, [timeLeft, submitted, showResults])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const currentQuestion = quizzes[currentIndex]

  const handleStartQuiz = () => {
    setShowWarningDialog(true)
  }

  const confirmStartQuiz = () => {
    setShowWarningDialog(false)
    setShowProctoringSetup(true)
  }

  const handleProctoringSetupComplete = async (stream: MediaStream) => {
    setMediaStream(stream)
    setShowProctoringSetup(false)
    setProctoringActive(true)
    setQuizStarted(true)

    // Create quiz attempt in database
    try {
      const response = await fetch("/api/quiz/attempt/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          courseId,
          maxScore: quizzes.reduce((sum, q) => sum + (q.max_points || 10), 0),
          proctoringEnabled: true,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setQuizAttemptId(data.attemptId)
      }
    } catch (error) {
      console.error("Failed to start quiz attempt:", error)
    }
  }

  const handleTermination = async (reason: string) => {
    setProctoringActive(false)
    setQuizStarted(false)
    setTerminationReason(reason)
    setHasCheated(true) // Flag as cheating/violation

    // Auto-submit with 0 score immediately
    await handleSubmit(true)
  }

  const handleProctoringSetupCancel = () => {
    setShowProctoringSetup(false)
    setShowWarningDialog(false)
  }

  // Handle proctoring violations
  const handleViolation = async (violation: ViolationData) => {
    setViolations((prev) => [...prev, violation])

    // Log violation to database
    if (quizAttemptId) {
      try {
        await fetch("/api/quiz/violation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quizAttemptId,
            violationType: violation.type,
            severity: violation.severity,
            evidence: violation.evidence,
          }),
        })
      } catch (error) {
        console.error("Failed to log violation:", error)
      }
    }

    // Critical violations terminate quiz
    if (violation.severity === "critical") {
      setHasCheated(true)
      setSubmitted(true)
      setShowResults(true)
      setProctoringActive(false)
      await handleSubmit(true)
    }

    // Terminate after 8 violations
    if (violations.length + 1 >= 8) {
      handleTermination("Too many proctoring violations detected (Maximum limit reached).")
    }
  }

  const handleTrustScoreChange = (score: number) => {
    setTrustScore(score)
  }

  // Tab switching detection
  useEffect(() => {
    if (!quizStarted || submitted || showResults) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation({
          type: "tab_switch",
          severity: "critical",
          timestamp: new Date(),
        })
      }
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = "Are you sure you want to leave? Your quiz progress will be lost and you'll receive 0%."
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [quizStarted, submitted, showResults])

  // Disable Copy/Paste/Right Click
  useEffect(() => {
    if (!quizStarted || submitted || showResults) return

    const handlePrevent = (e: Event) => {
      e.preventDefault()
    }

    document.addEventListener("contextmenu", handlePrevent)
    document.addEventListener("copy", handlePrevent)
    document.addEventListener("cut", handlePrevent)
    document.addEventListener("paste", handlePrevent)
    document.addEventListener("selectstart", handlePrevent)

    return () => {
      document.removeEventListener("contextmenu", handlePrevent)
      document.removeEventListener("copy", handlePrevent)
      document.removeEventListener("cut", handlePrevent)
      document.removeEventListener("paste", handlePrevent)
      document.removeEventListener("selectstart", handlePrevent)
    }
  }, [quizStarted, submitted, showResults])

  const handleAnswer = (answer: string) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: answer,
    })
  }

  const calculateScore = () => {
    let correct = 0
    quizzes.forEach((q) => {
      if (answers[q.id] === q.correct_answer) correct++
    })
    return Math.round((correct / quizzes.length) * 100)
  }

  const handleSubmit = async (isCheating = false) => {
    setShowResults(true)
    setSubmitted(true)
    setProctoringActive(false)

    const finalScore = isCheating ? 0 : calculateScore()

    try {
      // Save quiz attempt with proctoring data
      await fetch(`/api/courses/${courseId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          quizScore: finalScore,
          isCompleted: true,
          trustScore,
          violationsCount: violations.length,
          proctoringEnabled: true,
        }),
      })

      // Always mark lesson as quiz completed, even if violated
      await fetch(`/api/courses/${courseId}/lessons/${lessonId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "quiz" })
      })

      // Complete quiz attempt
      if (quizAttemptId) {
        await fetch("/api/quiz/attempt/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: quizAttemptId,
            score: finalScore,
            trustScore,
          }),
        })
      }
    } catch (error) {
      console.error("Failed to log progress:", error)
    }
  }

  const isAnswered = answers[currentQuestion.id] !== undefined

  // Proctoring Setup Modal
  if (showProctoringSetup) {
    return (
      <ProctoringSetup
        onComplete={handleProctoringSetupComplete}
        onCancel={handleProctoringSetupCancel}
      />
    )
  }

  // Already completed view
  if (isAlreadyCompleted && !quizStarted) {
    return (
      <div className="border-2 border-yellow-500 bg-yellow-50 p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Lock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-yellow-900">Quiz Already Completed</h2>
          <p className="text-yellow-800">
            You have already taken this quiz and scored <span className="font-bold text-2xl">{initialQuizScore}%</span>
          </p>
          <p className="text-sm text-yellow-700">
            To maintain academic integrity, quizzes can only be taken once. Your score has been recorded.
          </p>
          <div className="pt-4">
            <Badge className="bg-yellow-500 text-white text-lg px-6 py-2">
              Final Score: {initialQuizScore}%
            </Badge>
          </div>
        </div>
      </div>
    )
  }

  // Results view
  if (submitted && showResults) {
    const score = calculateScore()
    return (
      <div className="space-y-6">
        {/* Proctoring Summary */}
        {proctoringActive || violations.length > 0 ? (
          <Card className="border-2 border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Proctoring Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border-2 border-border bg-background">
                  <div className="text-sm text-muted-foreground">Trust Score</div>
                  <div className={`text-3xl font-bold ${trustScore >= 80 ? 'text-green-600' : trustScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {trustScore}%
                  </div>
                </div>
                <div className="p-4 border-2 border-border bg-background">
                  <div className="text-sm text-muted-foreground">Violations</div>
                  <div className={`text-3xl font-bold ${violations.length === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {violations.length}
                  </div>
                </div>
              </div>
              {violations.length > 0 && (
                <div className="p-4 bg-red-50 border-2 border-red-500">
                  <p className="text-sm text-red-800 font-medium">
                    Violations detected: {violations.map(v => v.type).join(", ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Score Display */}
        <div className="border-2 border-primary bg-primary/5 p-8 space-y-6">
          <div className="text-center space-y-4">
            {hasCheated ? (
              <>
                <h2 className="text-3xl font-bold text-red-500">Quiz Terminated</h2>
                <div className="text-6xl font-bold text-red-500">0%</div>
                <p className="text-lg text-muted-foreground p-4 bg-red-500/10 border border-red-500 rounded-md">
                  Critical proctoring violation detected. Your score has been recorded as 0.
                </p>
              </>
            ) : (
              <>
                {score === 100 ? (
                  <>
                    <h2 className="text-4xl font-bold text-green-600 animate-in zoom-in duration-500">Congratulations! 🎉</h2>
                    <div className="text-6xl font-bold text-green-500 drop-shadow-sm">{score}%</div>
                    <p className="text-xl text-green-700 font-medium">
                      Perfect Score! Excellent Work.
                    </p>
                    <p className="text-lg text-muted-foreground">
                      You answered all {quizzes.length} questions correctly.
                    </p>
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <p className="text-sm text-green-700 font-medium flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Your perfect score has been permanently recorded.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold">Quiz Complete!</h2>
                    <div className={`text-6xl font-bold ${score >= 80 ? 'text-green-600' : 'text-primary'}`}>{score}%</div>
                    <p className="text-lg text-muted-foreground">
                      You answered {Object.values(answers).filter((a, i) => a === quizzes[i]?.correct_answer).length} out of{" "}
                      {quizzes.length} questions correctly
                    </p>
                    <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      ⚠️ This quiz cannot be retaken. Your score of <strong>{score}%</strong> has been permanently recorded.
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          {/* Question Review */}
          <div className="space-y-4">
            {quizzes.map((q, idx) => {
              const userAnswer = answers[q.id]
              const isCorrectAnswer = userAnswer === q.correct_answer

              return (
                <div key={q.id} className="border-2 border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-semibold flex-1">
                      {idx + 1}. {q.question_text}
                    </p>
                    {isCorrectAnswer ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-semibold">Your answer:</span> {userAnswer}
                    </p>
                    {!isCorrectAnswer && (
                      <p>
                        <span className="font-semibold">Correct answer:</span> {q.correct_answer}
                      </p>
                    )}
                    {q.explanation && (
                      <div className="p-3 bg-accent/10 border-l-4 border-accent space-y-2">
                        <p className="flex items-center gap-2 font-semibold">
                          <Lightbulb className="h-4 w-4" />
                          Explanation
                        </p>
                        <p>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Quiz not started yet
  if (!quizStarted) {
    return (
      <>
        <Card className="border-2 border-primary bg-primary/5">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Ready to Start Quiz?</h2>
              <div className="space-y-2 text-left max-w-md mx-auto">
                <p className="text-muted-foreground">Before you begin, please note:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <span>This quiz has <strong>{quizzes.length} questions</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">•</span>
                    <span><strong className="text-red-600">AI Proctoring is ENABLED</strong> - Camera and microphone required</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">•</span>
                    <span><strong className="text-red-600">Tab switching is NOT allowed</strong> - You will automatically receive 0%</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 font-bold mt-0.5">•</span>
                    <span><strong className="text-yellow-700">You can only take this quiz ONCE</strong> - No retakes allowed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <span>Stay focused and answer carefully</span>
                  </li>
                </ul>
              </div>
              <Button
                onClick={handleStartQuiz}
                size="lg"
                className="bg-primary text-primary-foreground border-2 border-primary mt-4"
              >
                I Understand - Start Quiz
              </Button>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
          <AlertDialogContent className="border-2 border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Important Warning!
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p className="font-semibold text-foreground">
                  Once you start this quiz:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">⚠️</span>
                    <span>AI proctoring will monitor you via webcam and microphone</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">⚠️</span>
                    <span>Switching tabs or windows will <strong className="text-red-600">immediately terminate</strong> the quiz</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">⚠️</span>
                    <span>You will receive <strong className="text-red-600">0% score</strong> if you leave this page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 font-bold">⚠️</span>
                    <span>This quiz can only be taken <strong className="text-yellow-700">ONE TIME</strong></span>
                  </li>
                </ul>
                <p className="text-foreground font-medium pt-2">
                  Are you ready to proceed?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-2 border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmStartQuiz} className="bg-primary border-2 border-primary">
                Yes, Start Quiz Now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // Quiz Terminated View
  if (terminationReason) {
    return (
      <Card className="border-4 border-red-500 bg-red-50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-red-100 p-4 rounded-full mb-4 w-20 h-20 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-3xl text-red-700">Quiz Terminated</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <h3 className="font-bold text-xl text-red-900">Violation Detected</h3>
            <p className="text-lg text-red-800">{terminationReason}</p>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-red-200 text-left max-w-sm mx-auto">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Proctoring Report
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Trust Score: <span className="text-red-600 font-bold">{trustScore}%</span></li>
              <li>• Status: <span className="text-red-600 font-bold">Disqualified</span></li>
              <li>• Attempt ID: <span className="font-mono">{quizAttemptId?.slice(0, 8)}...</span></li>
            </ul>
          </div>

          <Button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white w-full max-w-xs"
          >
            Return to Lesson
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Active quiz view
  return (
    <>
      {/* Proctoring Monitor - Persistent Video */}
      {proctoringActive && (
        <ProctoringMonitor
          isActive={proctoringActive}
          stream={mediaStream}
          onViolation={async (violation) => {
            // Log violation
            handleViolation(violation)

            // CRITICAL: Immediate Termination Rules
            if (violation.type === "multiple_faces") {
              handleTermination("Multiple faces detected in the camera frame.")
            } else if (violation.type === "no_face" && violation.severity === "high") {
              // Only terminate if it's a persistent no-face (severity high)
              handleTermination("You moved out of the camera frame.")
            }
          }}
          onTrustScoreChange={handleTrustScoreChange}
        />
      )}

      <Card
        className="border-2 border-border select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Question {currentIndex + 1} of {quizzes.length}
            </CardTitle>
            <div className="flex items-center gap-2">
              {proctoringActive && (
                <Badge className="bg-green-500 text-white border-green-600">
                  <Shield className="h-3 w-3 mr-1" />
                  Proctored
                </Badge>
              )}
              {/* Timer Badge */}
              <Badge
                className={`border-2 ${timeLeft < 60 ? "bg-red-100 text-red-600 border-red-500 animate-pulse" : "bg-primary/10 text-primary border-primary/20"}`}
                variant="outline"
              >
                <Timer className="h-4 w-4 mr-1.5" />
                <span className="font-mono text-sm tracking-widest">{formatTime(timeLeft)}</span>
              </Badge>
              <Badge className="bg-red-500 text-white border-red-600 animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                No Tab Switching!
              </Badge>
              <Badge
                className={`border-2 ${currentQuestion.difficulty === "hard" ? "border-primary bg-primary" : currentQuestion.difficulty === "medium" ? "border-secondary bg-secondary" : "border-accent bg-accent"}`}
              >
                {currentQuestion.difficulty}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg font-semibold">{currentQuestion.question_text}</p>

          {currentQuestion.question_type === "mcq" && currentQuestion.options ? (
            <div className="space-y-3">
              {Object.entries(currentQuestion.options).map(([key, value]: [string, any]) => (
                <label
                  key={key}
                  className="flex items-start gap-4 p-4 border-2 border-border cursor-pointer hover:border-primary transition-all"
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={value}
                    checked={answers[currentQuestion.id] === value}
                    onChange={() => handleAnswer(value)}
                    className="mt-1"
                  />
                  <span className="flex-1">{value}</span>
                </label>
              ))}
            </div>
          ) : (
            <Textarea
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Enter your answer..."
              className="w-full p-4 border-2 border-border bg-background text-foreground min-h-32"
            />
          )}

          <div className="flex items-center justify-between pt-4 border-t-2 border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="border-2 border-border"
            >
              Previous
            </Button>

            {currentIndex === quizzes.length - 1 ? (
              <Button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={!isAnswered}
                className="bg-primary text-primary-foreground border-2 border-primary"
              >
                Submit Quiz
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(quizzes.length - 1, prev + 1))}
                className="bg-primary text-primary-foreground border-2 border-primary"
              >
                Next Question
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
