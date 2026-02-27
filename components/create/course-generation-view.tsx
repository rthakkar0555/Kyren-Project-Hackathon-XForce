"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { CourseBuilderGame } from "./course-builder-game"
import { Loader2, Sparkles } from "lucide-react"

interface CourseGenerationViewProps {
    status: string
    progress?: number // 0 to 100
}

export default function CourseGenerationView({ status, progress = 0 }: CourseGenerationViewProps) {
    const [localProgress, setLocalProgress] = useState(0)

    // Smooth mock progress if actual progress isn't precise
    useEffect(() => {
        const interval = setInterval(() => {
            setLocalProgress(old => {
                if (old >= 95) return 95
                return old + Math.random() * 2
            })
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="h-full w-full flex flex-col justify-between p-1">
            {/* Top Bar: Progress */}
            <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-bold text-primary">
                        <Sparkles className="h-4 w-4 animate-spin-slow" />
                        <span>AI Generating Course</span>
                    </div>
                    <span className="text-muted-foreground text-xs font-mono">{Math.round(localProgress)}%</span>
                </div>
                <Progress value={localProgress} className="h-1.5" />
                <p className="text-xs text-muted-foreground text-center animate-pulse">{status || "Analyzing topic..."}</p>
            </div>

            {/* Main Content: The Game */}
            <div className="flex-1 border-2 border-dashed border-border/50 rounded-lg bg-secondary/5 overflow-hidden relative">
                <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
                <CourseBuilderGame />
            </div>

            {/* Footer hint */}
            <div className="mt-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Powered by Kyren AI</p>
            </div>
        </div>
    )
}
