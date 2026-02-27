"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Sparkles } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlayCircle, Type } from "lucide-react"
// New Components
import { DraggableFlipCard } from "@/components/create/draggable-flip-card"
import { TicTacToeGame } from "@/components/game/tic-tac-toe"
import { cn } from "@/lib/utils"

// Front Face Content: Professional Progress Dashboard
// Front Face Content: Professional Progress Dashboard
function ProgressView({ status }: { status: string }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev
        return prev + Math.random() * 3
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // Determine stage based on status
  const getStage = () => {
    if (status.includes("Initializing") || status.includes("Structuring")) return { num: 1, label: "Initializing" }
    if (status.includes("Generating") || status.includes("Creating")) return { num: 2, label: "Generating" }
    if (status.includes("Finalizing") || status.includes("Polishing")) return { num: 3, label: "Finalizing" }
    return { num: 1, label: "Processing" }
  }

  const stage = getStage()

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-900 dark:to-zinc-950">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Generating Course</h2>
            <p className="text-sm text-muted-foreground mt-1">AI is creating your personalized content</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-medium text-primary">Live</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 py-8 flex flex-col justify-center space-y-8">
        {/* Progress Circle */}
        <div className="flex items-center justify-center">
          <div className="relative w-48 h-48">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                className="text-primary transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{Math.round(progress)}%</span>
              <span className="text-xs text-muted-foreground mt-1">Complete</span>
            </div>
          </div>
        </div>

        {/* Status Steps */}
        <div className="space-y-3">
          {[
            { num: 1, label: "Initializing", desc: "Setting up structure" },
            { num: 2, label: "Generating", desc: "Creating content" },
            { num: 3, label: "Finalizing", desc: "Polishing details" }
          ].map((step) => (
            <div
              key={step.num}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border transition-all",
                stage.num === step.num
                  ? "bg-primary/5 border-primary/30"
                  : stage.num > step.num
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                    : "bg-muted/30 border-border/50"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                  stage.num === step.num
                    ? "bg-primary text-primary-foreground animate-pulse"
                    : stage.num > step.num
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {stage.num > step.num ? "✓" : step.num}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{step.label}</div>
                <div className="text-xs text-muted-foreground">{step.desc}</div>
              </div>
              {stage.num === step.num && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
            </div>
          ))}
        </div>

        {/* Current Status */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Current Task</p>
              <p className="text-xs text-muted-foreground mt-1">{status}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Hint */}
      <div className="px-8 py-4 border-t border-border/50 bg-muted/30">
        <p className="text-xs text-center text-muted-foreground">
          💡 <span className="font-medium">Tip:</span> Drag the card to play a mini-game while you wait
        </p>
      </div>
    </div>
  )
}

export default function CreateCoursePage() {
  const [topic, setTopic] = useState("")
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [mode, setMode] = useState<"topic" | "playlist">("topic")
  const [difficulty, setDifficulty] = useState("intermediate")
  const [numModules, setNumModules] = useState("4")
  const [llmProvider, setLlmProvider] = useState("openai")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planName, setPlanName] = useState<string>("")
  const [statusMessage, setStatusMessage] = useState("Initializing...")
  const router = useRouter()

  const [usage, setUsage] = useState<{ created: number, max: number, plan: string } | null>(null)

  // Fetch user plan and usage on mount
  useEffect(() => {
    fetch('/api/user/usage')
      .then(res => res.json())
      .then(data => {
        if (data.plan_name) {
          setPlanName(data.plan_name)
          setUsage({
            created: data.courses_created || 0,
            max: data.max_courses || 0,
            plan: data.plan_name
          })
        }
      })
      .catch(err => console.error("Failed to fetch plan", err))
  }, [])

  const isLimitReached = usage ? usage.created >= usage.max : false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsGenerating(true)
    setStatusMessage("Structuring course modules...")

    try {
      const response = await fetch("/api/courses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulty,
          numModules: Number.parseInt(numModules),
          lessonsPerModule: 3,
          llmProvider,
          playlistUrl: mode === "playlist" ? playlistUrl : undefined,
          topic: mode === "topic" ? topic : (topic || "Course from Playlist") // Pass playlist URL primarily, but topic if set
        }),
      })

      if (!response.ok) {
        let errorMessage = "Failed to generate course"
        try {
          const contentType = response.headers.get("content-type")
          if (contentType?.includes("application/json")) {
            const data = await response.json()
            errorMessage = data.error || errorMessage
          } else {
            errorMessage = `Server error (${response.status})`
          }
        } catch {
          errorMessage = `Server error (${response.status})`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setStatusMessage("Finalizing content...")

      setTimeout(() => {
        router.push(`/dashboard/courses/${data.courseId}`)
      }, 1000)

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsGenerating(false)
    }
  }

  // If Generating, show the Card Experience
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[90vh]">
        <div className="w-full max-w-2xl">
          {/* The Premium Wait Experience */}
          <DraggableFlipCard
            isFlippedDefault={true} // Default to Game
            frontContent={<ProgressView status={statusMessage} />}
            backContent={<TicTacToeGame />}
          />
          <p className="text-center mt-8 text-sm text-muted-foreground opacity-50 font-mono">
            Drag card to flip
          </p>
        </div>
      </div>
    )
  }

  // Normal Form
  return (
    <div className="p-8 max-w-2xl mx-auto min-h-[80vh] flex flex-col justify-center">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-4xl font-bold tracking-tighter">Create New Course</h1>
        <p className="text-muted-foreground mt-2">Let AI generate a structured course from your topic</p>
      </div>

      <Card className="border-2 border-border shadow-md bg-card">
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
          <CardDescription>Provide information about your course</CardDescription>
        </CardHeader>
        <CardContent>
          {isLimitReached ? (
            <div className="text-center py-10 space-y-6">
              <div className="bg-destructive/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">🚫</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Course Limit Reached</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  You have created {usage?.created} out of {usage?.max} allowed courses on the <span className="font-semibold">{usage?.plan}</span>.
                </p>
              </div>
              <Button
                onClick={() => router.push('/dashboard/subscription')}
                className="bg-primary text-primary-foreground text-lg py-6 px-8"
              >
                Upgrade Plan to Create More
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">

              <Tabs defaultValue="topic" onValueChange={(v) => setMode(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="topic" className="flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    By Topic
                  </TabsTrigger>
                  <TabsTrigger value="playlist" className="flex items-center gap-2">
                    <PlayCircle className="w-4 h-4" />
                    YouTube Playlist
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="topic" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic" className="text-base font-bold">
                      Course Topic
                    </Label>
                    <Input
                      id="topic"
                      placeholder="e.g., Python Decorators, Machine Learning Basics"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="border-2 border-border py-6 text-base"
                      required={mode === "topic"}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="playlist" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="playlist" className="text-base font-bold">
                      YouTube Playlist URL
                    </Label>
                    <Input
                      id="playlist"
                      placeholder="e.g., https://www.youtube.com/playlist?list=..."
                      value={playlistUrl}
                      onChange={(e) => setPlaylistUrl(e.target.value)}
                      className="border-2 border-border py-6 text-base"
                      required={mode === "playlist"}
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll extract videos from this playlist to create your course modules.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="playlist-topic" className="text-base font-bold">
                      Course Title (Optional)
                    </Label>
                    <Input
                      id="playlist-topic"
                      placeholder="Name your course (optional)"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="border-2 border-border py-6 text-base"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty" className="text-base font-bold">
                    Difficulty Level
                  </Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="border-2 border-border py-6">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modules" className="text-base font-bold">
                    Number of Modules
                  </Label>
                  <Select
                    value={numModules}
                    onValueChange={(val) => {
                      if (planName === "Educational User" && parseInt(val) > 4) return
                      setNumModules(val)
                    }}
                  >
                    <SelectTrigger className="border-2 border-border py-6">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Modules</SelectItem>
                      <SelectItem value="3">3 Modules</SelectItem>
                      <SelectItem value="4">4 Modules</SelectItem>
                      <SelectItem value="5" disabled={planName === "Educational User"}>
                        5 Modules {planName === "Educational User" && "(Limit)"}
                      </SelectItem>
                      <SelectItem value="6" disabled={planName === "Educational User"}>
                        6 Modules {planName === "Educational User" && "(Limit)"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {planName === "Educational User" && (
                    <p className="text-xs text-muted-foreground mt-1">Educational Plan limited to 4 modules.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="llm" className="text-base font-bold">
                  AI Model
                </Label>
                <Select value={llmProvider} onValueChange={setLlmProvider}>
                  <SelectTrigger className="border-2 border-border py-6">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI GPT-4 (Recommended)</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-500 flex items-start gap-3">
                  <div className="h-2 w-2 mt-2 rounded-full bg-red-500 shrink-0" />
                  <p className="text-red-900 font-medium text-sm grid">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isGenerating || (mode === "topic" && !topic.trim()) || (mode === "playlist" && !playlistUrl.trim())}
                className="w-full bg-primary text-primary-foreground border-2 border-primary py-6 text-base font-bold hover:shadow-lg transition-all"
              >
                Generate Course
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
