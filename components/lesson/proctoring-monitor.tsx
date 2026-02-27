"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as tf from "@tensorflow/tfjs"
import * as cocossd from "@tensorflow-models/coco-ssd"
import { FaceMesh } from "@mediapipe/face_mesh"
import { Camera, CameraOff, AlertTriangle, Eye, Volume2, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ProctoringMonitorProps {
    isActive: boolean
    stream: MediaStream | null
    onViolation: (violation: ViolationData) => void
    onTrustScoreChange: (score: number) => void
}

interface ViolationData {
    type: "multiple_faces" | "no_face" | "looking_away" | "audio_detected" | "tab_switch" | "phone_detected" | "face_movement" | "suspicious_eye_movement"
    severity: "low" | "medium" | "high" | "critical"
    timestamp: Date
    evidence?: string
}

export default function ProctoringMonitor({ isActive, stream, onViolation, onTrustScoreChange }: ProctoringMonitorProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [faceMesh, setFaceMesh] = useState<FaceMesh | null>(null)
    const [objectModel, setObjectModel] = useState<cocossd.ObjectDetection | null>(null)
    const [faceCount, setFaceCount] = useState(0)
    const [trustScore, setTrustScore] = useState(100)
    const [violations, setViolations] = useState<ViolationData[]>([])
    const [noFaceTimer, setNoFaceTimer] = useState(0)
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
    const [isLookingAway, setIsLookingAway] = useState(false)
    const [movementWarning, setMovementWarning] = useState<string | null>(null)

    const [gracePeriod, setGracePeriod] = useState(true)

    // Eye Tracking History for Volatility
    const eyeMovementHistory = useRef<{ x: number, y: number }[]>([])

    // Initialize AI Models
    useEffect(() => {
        const loadModels = async () => {
            try {
                await tf.ready()

                // Load Object Detection (COCO-SSD)
                const loadedObjectModel = await cocossd.load({ base: 'lite_mobilenet_v2' })
                setObjectModel(loadedObjectModel)

                // Load FaceMesh (MediaPipe)
                const mesh = new FaceMesh({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                    }
                });

                mesh.setOptions({
                    maxNumFaces: 2,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                mesh.onResults(onFaceResults);
                setFaceMesh(mesh)

                // Start Grace Period Timeout
                setTimeout(() => setGracePeriod(false), 5000);

                console.log("AI Monitoring Models (FaceMesh + COCO-SSD) loaded successfully")
            } catch (error) {
                console.error("Error loading models:", error)
            }
        }
        loadModels()
    }, [])

    // Face Mesh Results Handler
    const onFaceResults = (results: any) => {
        if (!activeRef.current) return;

        const multiFaceLandmarks = results.multiFaceLandmarks;
        const count = multiFaceLandmarks ? multiFaceLandmarks.length : 0;
        setFaceCount(count);

        if (count === 0) {
            // Only flag if not in grace period
            if (!gracePeriodRef.current) {
                handleViolationWrapper({ type: "no_face", severity: "high", timestamp: new Date() }, true);
            }
        } else if (count > 1) {
            // Multiple faces are always critical
            handleViolationWrapper({ type: "multiple_faces", severity: "critical", timestamp: new Date() });
            setMovementWarning("Multiple faces detected!");
        } else {
            // One face detected - Analyze Gaze
            const landmarks = multiFaceLandmarks[0];
            analyzeGaze(landmarks);
        }
    }

    const activeRef = useRef(isActive);
    const gracePeriodRef = useRef(gracePeriod); // Use ref for access in callback
    useEffect(() => { activeRef.current = isActive }, [isActive]);
    useEffect(() => { gracePeriodRef.current = gracePeriod }, [gracePeriod]);

    // Gaze Analysis Logic
    const analyzeGaze = (landmarks: any[]) => {
        // Iris Landmarks (Refine Landmarks enabled)
        // Left Iris Center: 468, Right Iris Center: 473
        // Eye Corners: Left(33, 133), Right(362, 263)

        // Simple Yaw Estimation (Nose vs Ears) still useful as fallback or base
        const nose = landmarks[1];
        const leftEar = landmarks[234];
        const rightEar = landmarks[454];

        const distLeft = Math.abs(nose.x - leftEar.x);
        const distRight = Math.abs(nose.x - rightEar.x);
        const totalDist = distLeft + distRight;
        const yawRatio = (distLeft - distRight) / totalDist; // -1 to 1

        // Iris Tracking (Horizontal)
        // We calculate the relative position of the iris within the eye
        const leftIris = landmarks[468];
        const leftEyeLeftCorner = landmarks[33];
        const leftEyeRightCorner = landmarks[133];

        const eyeWidth = Math.abs(leftEyeRightCorner.x - leftEyeLeftCorner.x);
        const irisPos = Math.abs(leftIris.x - leftEyeLeftCorner.x);
        const irisRatio = irisPos / eyeWidth; // 0 (Left) to 1 (Right)

        // Update Movement History for Volatility
        const currentGaze = { x: irisRatio, y: landmarks[468].y };
        eyeMovementHistory.current.push(currentGaze);
        if (eyeMovementHistory.current.length > 20) eyeMovementHistory.current.shift();

        // Calculate Volatility (Standard Deviation of X movements)
        let volatility = 0;
        if (eyeMovementHistory.current.length > 5) {
            const mean = eyeMovementHistory.current.reduce((a, b) => a + b.x, 0) / eyeMovementHistory.current.length;
            const variance = eyeMovementHistory.current.reduce((a, b) => a + Math.pow(b.x - mean, 2), 0) / eyeMovementHistory.current.length;
            volatility = Math.sqrt(variance);
        }

        // --- VIOLATION CHECKS ---

        // 1. Head Turn (Yaw)
        // Adjusted specific thresholds to be slightly less sensitive but accurate
        if (yawRatio > 0.7) {
            setMovementWarning("Looking Right ->");
            setIsLookingAway(true);
            handleViolationWrapper({ type: "looking_away", severity: "medium", timestamp: new Date() });
        } else if (yawRatio < -0.7) {
            setMovementWarning("<- Looking Left");
            setIsLookingAway(true);
            handleViolationWrapper({ type: "looking_away", severity: "medium", timestamp: new Date() });
        }
        // 2. Suspicious Eye Movement (Scanning/Reading)
        else if (volatility > 0.2) { // Increased threshold to reduce false positives
            setMovementWarning("Suspicious Eye Movement");
            setIsLookingAway(true);
            handleViolationWrapper({ type: "suspicious_eye_movement", severity: "high", timestamp: new Date() });
        }
        else {
            setMovementWarning(null);
            setIsLookingAway(false);
        }
    }

    const handleViolationWrapper = (violation: ViolationData, isFrameCheck = false) => {
        // Debounce logic handled in main handler, but useful to have a wrapper
        handleViolation(violation);
    }


    // Initialize Video Stream
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play().catch(e => console.error("Monitor video play error:", e))

            // Audio Monitoring Setup
            try {
                const audioCtx = new AudioContext()
                const source = audioCtx.createMediaStreamSource(stream)
                const analyser = audioCtx.createAnalyser()
                analyser.fftSize = 256
                source.connect(analyser)
                setAudioContext(audioCtx)
            } catch (e) {
                console.error("Audio context error:", e)
            }
        }
    }, [stream])

    // Cleanup Audio
    useEffect(() => {
        return () => {
            audioContext?.close()
        }
    }, [])

    // Main Detection Loop (Video Processing)
    useEffect(() => {
        let animationId: number
        let lastTime = 0
        let lastObjectCheckTime = 0

        const detectFrame = async (time: number) => {
            if (!activeRef.current || !videoRef.current || !faceMesh || !objectModel) {
                // If stopped, don't request next frame
                return
            }

            const video = videoRef.current

            // Ensure video is ready
            if (video.readyState < 2) {
                animationId = requestAnimationFrame(detectFrame)
                return
            }

            // Throttle FaceMesh to ~10 FPS (100ms) to save CPU
            if (time - lastTime >= 100) {
                lastTime = time
                try {
                    // 1. Send to FaceMesh
                    await faceMesh.send({ image: video });

                    // 2. Object Detection (Every 1s)
                    if (time - lastObjectCheckTime > 1000) {
                        lastObjectCheckTime = time
                        const objects = await objectModel.detect(video)

                        // Filter for relevant objects with high confidence
                        const violationsDetected = objects.filter(obj =>
                            ['cell phone', 'mobile phone', 'laptop', 'book'].includes(obj.class) &&
                            obj.score > 0.60
                        )

                        if (violationsDetected.length > 0) {
                            const detectedObj = violationsDetected[0]
                            handleViolationWrapper({
                                type: "phone_detected",
                                severity: "critical",
                                timestamp: new Date(),
                                evidence: `Detected ${detectedObj.class}`
                            })
                            setMovementWarning(`Object: ${detectedObj.class}`);
                        }
                    }

                } catch (err) {
                    console.error("AI Detection Error:", err)
                }
            }

            animationId = requestAnimationFrame(detectFrame)
        }

        if (isActive && faceMesh && objectModel) {
            console.log("Starting AI Detection Loop")
            animationId = requestAnimationFrame(detectFrame)
        }

        return () => {
            if (animationId) cancelAnimationFrame(animationId)
        }
    }, [faceMesh, objectModel, isActive])

    // Audio monitoring
    useEffect(() => {
        if (!audioContext || !isActive) return

        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        let checkAudioInterval: NodeJS.Timeout

        const checkAudio = () => {
            analyser.getByteFrequencyData(dataArray)
            const average = dataArray.reduce((a, b) => a + b) / bufferLength

            // If audio level is above threshold, flag as suspicious
            if (average > 50) {
                handleViolation({
                    type: "audio_detected",
                    severity: "low",
                    timestamp: new Date(),
                })
            }
        }

        checkAudioInterval = setInterval(checkAudio, 2000)

        return () => {
            if (checkAudioInterval) {
                clearInterval(checkAudioInterval)
            }
        }
    }, [audioContext, isActive])

    // Handle violations
    const handleViolation = useCallback(
        (violation: ViolationData) => {
            // Prevent duplicate violations within 3 seconds (or longer for some types)
            const recentViolation = violations.find(
                (v) =>
                    v.type === violation.type && new Date().getTime() - v.timestamp.getTime() < 3000
            )

            if (recentViolation) return

            setViolations((prev) => [...prev, violation])

            // Decrease trust score based on severity
            const scoreDecrease = {
                low: 2,
                medium: 5,
                high: 15,
                critical: 30,
            }[violation.severity]

            const newScore = Math.max(0, trustScore - scoreDecrease)
            setTrustScore(newScore)
            onTrustScoreChange(newScore)
            onViolation(violation)
        },
        [violations, trustScore, onViolation, onTrustScoreChange]
    )

    // Get status text
    const getStatusText = () => {
        if (movementWarning) return movementWarning
        if (!stream) return "Connecting..."
        if (faceCount === 0) return "Lost Face!"
        if (faceCount > 1) return "Multiple Faces!"
        if (isLookingAway) return "Looking Away"
        return "Monitoring Active"
    }

    // Get status color
    const getStatusColor = () => {
        if (movementWarning || faceCount > 1 || faceCount === 0) return "bg-red-500 animate-pulse"
        if (trustScore >= 80) return "bg-green-500"
        if (trustScore >= 60) return "bg-yellow-500"
        return "bg-red-500"
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
            {/* Status Panel */}
            <div className="bg-card border-2 border-border p-4 shadow-xl rounded-lg flex items-center gap-3 w-80">
                <div className={`w-4 h-4 rounded-full ${getStatusColor()}`} />
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-base">AI Proctoring</span>
                        <span className={`font-mono font-bold ${trustScore < 60 ? 'text-red-500' : 'text-green-500'}`}>
                            {trustScore}%
                        </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-medium truncate">
                        {getStatusText()}
                    </div>
                </div>
            </div>

            {/* Video Feed (Always visible if stream exists) */}
            {stream && (
                <div className="relative w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-primary shadow-2xl">
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                    />

                    {/* Visual Warnings Overlay */}
                    {(movementWarning || faceCount > 1) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
                            <span className="text-white font-bold text-center px-2 text-sm uppercase tracking-wider animate-pulse">
                                {movementWarning || "Multiple Faces!"}
                            </span>
                        </div>
                    )}
                </div>
            )}
            {/* Violations Count */}
            {violations.length > 0 && (
                <div className="bg-red-500/10 border-2 border-red-500 p-2 text-xs">
                    <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-bold">{violations.length} Violation(s) Detected</span>
                    </div>
                </div>
            )}
        </div>
    )
}
