"use client"

import { useEffect, useRef, useState } from "react"
import ProctoringMonitor from "@/components/lesson/proctoring-monitor"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Camera, AlertTriangle, ShieldCheck } from "lucide-react"

export default function TestProctoringPage() {
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [isActive, setIsActive] = useState(false)
    const [violations, setViolations] = useState<any[]>([])
    const [trustScore, setTrustScore] = useState(100)

    const startCamera = async () => {
        try {
            // First stop any existing tracks to be safe
            if (stream) {
                stream.getTracks().forEach(track => track.stop())
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true, // Simplest constraint first to avoid resolution negotiation issues
                // audio: true 
            })
            setStream(mediaStream)
            setIsActive(true)
        } catch (err: any) {
            console.error("Error accessing camera:", err)
            if (err.name === 'NotAllowedError') {
                alert("Camera permission denied. Please allow camera access in your browser settings.")
            } else if (err.name === 'NotFoundError') {
                alert("No camera found. Please check your connection.")
            } else if (err.name === 'AbortError') {
                // Common if another request interrupts or hardware times out
                console.warn("Camera request aborted/timed out. Retrying...")
            } else {
                alert(`Camera Error: ${err.message || 'Unknown error'}`)
            }
        }
    }

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
            setIsActive(false)
        }
    }

    const handleViolation = (violation: any) => {
        setViolations(prev => [violation, ...prev])
    }

    return (
        <div className="container mx-auto p-8 space-y-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-8 h-8 text-primary" />
                Proctoring System Test Lab
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Control Panel */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Controls</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                Use this panel to activate the AI monitoring system and test its detection capabilities.
                            </p>
                            <div className="flex gap-4">
                                {!isActive ? (
                                    <Button onClick={startCamera} size="lg" className="w-full">
                                        <Camera className="mr-2 h-4 w-4" /> Start Camera & AI
                                    </Button>
                                ) : (
                                    <Button onClick={stopCamera} variant="destructive" size="lg" className="w-full">
                                        Stop Monitoring
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Instructions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>How to Test</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Object Detection:</strong> Hold up a mobile phone or book clearly in the frame.</li>
                                <li><strong>Gaze Tracking (Yaw):</strong> Turn your head significantly left or right.</li>
                                <li><strong>Iris Tracking:</strong> Keep your head still but look sharply to the side.</li>
                                <li><strong>Rapid/Suspicious Scanning:</strong> Dart your eyes back and forth quickly as if reading text off-screen.</li>
                                <li><strong>Face Count:</strong> Have another person enter the frame.</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Logs Panel */}
                <div className="h-[500px] overflow-hidden flex flex-col">
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Live Violation Log</CardTitle>
                                <span className={`font-mono font-bold text-xl ${trustScore < 60 ? 'text-red-500' : 'text-green-500'}`}>
                                    Score: {trustScore}%
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto space-y-2 p-4 bg-muted/20">
                            {violations.length === 0 && (
                                <p className="text-center text-muted-foreground italic mt-10">
                                    No violations detected yet. System is monitoring...
                                </p>
                            )}
                            {violations.map((v, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-background border rounded-lg shadow-sm animate-in slide-in-from-right-5">
                                    <AlertTriangle className={`h-5 w-5 shrink-0 ${v.severity === 'critical' ? 'text-red-600' : 'text-yellow-500'}`} />
                                    <div>
                                        <p className="font-bold text-sm uppercase">{v.type.replace(/_/g, " ")}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {v.timestamp.toLocaleTimeString()} - {v.evidence || "Behavioral anomaly detected"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* The Actual Monitor Component (Hidden/Overlay) */}
            {isActive && (
                <ProctoringMonitor
                    isActive={isActive}
                    stream={stream}
                    onViolation={handleViolation}
                    onTrustScoreChange={setTrustScore}
                />
            )}
        </div>
    )
}
