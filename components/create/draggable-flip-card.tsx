"use client"

import React, { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface DraggableFlipCardProps {
    frontContent: React.ReactNode
    backContent: React.ReactNode
    isFlippedDefault?: boolean
}

export function DraggableFlipCard({ frontContent, backContent, isFlippedDefault = false }: DraggableFlipCardProps) {
    const [rotation, setRotation] = useState(isFlippedDefault ? 180 : 0)
    const [isDragging, setIsDragging] = useState(false)
    const startX = useRef(0)
    const startRotation = useRef(0)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isFlippedDefault) setRotation(180)
        else setRotation(0)
    }, [isFlippedDefault])

    const handlePointerDown = (e: React.PointerEvent) => {
        // Only allow drag if we are checking the edges or specific areas? 
        // User said "Drag the entire card". But we have interactive elements (Form) on Front.
        // Dragging form inputs is bad. 
        // Strategy: Only enable drag if start is on the BACK (Game) or maybe a bezel on Front?
        // User said "The default state during generation is the back side".
        // So mostly we are dragging the BACK side to peek at the FRONT. 
        // Let's allow drag everywhere but maybe messy with inputs. 
        // Actually, user said "Front Side (Progress View)". The Input Form is GONE once generation starts.
        // Ah! "Once course generation begins... card transforms".
        // So Front = Progress, Back = Game. 
        // The "Form" is independent or replaced.
        // We will assume this Component is mounted ONLY when generation starts.

        setIsDragging(true)
        startX.current = e.clientX
        startRotation.current = rotation
        e.currentTarget.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !containerRef.current) return
        const width = containerRef.current.clientWidth
        const deltaX = e.clientX - startX.current

        // Sensitivity: Full width drag = 180deg rotation
        const deg = (deltaX / width) * 180
        let newRotation = startRotation.current - deg // Drag left (negative delta) = increase rotation?
        // Dragging LEFT (negative x) should rotate showing right side?
        // Let's follow standard: Drag Left -> Rotate Y goes negative?
        // If I see Back (180), drag Right (positive X) -> Rotate towards 0 (Front).

        setRotation(newRotation)
    }

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return
        setIsDragging(false)

        // Snap logic
        // Normalize rotation 0-360
        const norm = rotation % 360

        // If closer to 180 (Back) -> Snap 180
        // If closer to 0 or 360 -> Snap 0
        // Simple logic: if abs(rotation - 180) < 90 ?

        // Determine closest face
        // 0 = Front, 180 = Back
        // We only have 2 states for this strict UI

        let target = 0
        // We treat 180 as "active" Back state
        const distTo0 = Math.abs(rotation - 0)
        const distTo180 = Math.abs(rotation - 180)

        if (distTo180 < distTo0) target = 180
        else target = 0

        setRotation(target)
    }

    return (
        <div className="perspective-1000 w-full h-[600px] cursor-grab active:cursor-grabbing select-none" ref={containerRef}>
            <div
                className="w-full h-full relative transition-transform duration-500 ease-out transform-style-3d shadow-xl rounded-xl"
                style={{
                    transform: `rotateY(${rotation}deg)`,
                    transition: isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* FRONT FACE (0deg) - Progress View */}
                <div className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    {frontContent}
                </div>

                {/* BACK FACE (180deg) - Game View */}
                <div
                    className="absolute inset-0 w-full h-full backface-hidden bg-zinc-50 dark:bg-zinc-950 border-2 border-primary/20 rounded-xl overflow-hidden"
                    style={{ transform: 'rotateY(180deg)' }}
                    onPointerDown={(e) => {
                        // Allow game interaction - don't start dragging when clicking game
                        e.stopPropagation()
                    }}
                >
                    {backContent}
                </div>
            </div>
        </div>
    )
}
