"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Circle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Node = {
    id: string
    label: string
    type: "concept" | "structure" | "assessment"
}

const INITIAL_NODES: Node[] = [
    { id: "1", label: "Topic Selection", type: "concept" },
    { id: "2", label: "Module Structure", type: "structure" },
    { id: "3", label: "Lesson Content", type: "structure" },
    { id: "4", label: "Quiz Generation", type: "assessment" },
]

export function CourseBuilderGame() {
    const [completeStep, setCompleteStep] = useState(0)
    const [nodes, setNodes] = useState<Node[]>([])

    // Simulate "giving" the user nodes to place
    useEffect(() => {
        const timer = setTimeout(() => {
            setNodes(INITIAL_NODES)
        }, 500)
        return () => clearTimeout(timer)
    }, [])

    const handleNodeClick = (index: number) => {
        if (index === completeStep) {
            setCompleteStep(prev => prev + 1)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center p-6 space-y-8 h-full min-h-[400px]">
            <div className="text-center space-y-2">
                <h3 className="text-lg font-bold tracking-tight">While we build your course...</h3>
                <p className="text-sm text-muted-foreground">Verify the learning flow below.</p>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-md relative">
                {/* Vertical Line */}
                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-border -z-10" />

                {INITIAL_NODES.map((node, index) => {
                    const isActive = index === completeStep
                    const isCompleted = index < completeStep
                    const isPending = index > completeStep

                    return (
                        <div
                            key={node.id}
                            onClick={() => handleNodeClick(index)}
                            className={cn(
                                "flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer",
                                isCompleted ? "bg-primary/10 border-primary" :
                                    isActive ? "bg-card border-primary scale-105 shadow-md" : "bg-card/50 border-border opacity-50 grayscale"
                            )}
                        >
                            <div className={cn(
                                "h-4 w-4 rounded-full flex items-center justify-center shrink-0 border-2",
                                isCompleted ? "bg-primary border-primary" : "bg-background border-primary"
                            )}>
                                {isCompleted && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                                {isActive && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                            </div>

                            <div className="flex-1">
                                <p className={cn("font-bold text-sm", isCompleted && "text-primary")}>{node.label}</p>
                                <p className="text-xs text-muted-foreground">
                                    {isCompleted ? "Verified" : isActive ? "Click to verify step" : "Pending..."}
                                </p>
                            </div>

                            {isActive && <ArrowRight className="h-4 w-4 text-primary animate-bounce-horizontal" />}
                        </div>
                    )
                })}
            </div>

            <p className="text-xs text-muted-foreground italic opacity-70">
                "Structured learning improves retention by 40%."
            </p>
        </div>
    )
}
