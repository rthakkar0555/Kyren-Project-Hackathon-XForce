"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Mic, CheckCircle2, XCircle, AlertTriangle, Eye, Loader2, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import * as tf from "@tensorflow/tfjs"
import * as blazeface from "@tensorflow-models/blazeface"
import * as cocossd from "@tensorflow-models/coco-ssd"

interface ProctoringSetupProps {
    onComplete: (stream: MediaStream) => void
    onCancel: () => void
}

export default function ProctoringSetup({ onComplete, onCancel }: ProctoringSetupProps) {
    const [step, setStep] = useState<"intro" | "permissions" | "test" | "ready">("intro")
    const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending")
    const [micPermission, setMicPermission] = useState<"pending" | "granted" | "denied">("pending")
    const [stream, setStream] = useState<MediaStream | null>(null)

    const handleCancel = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
        }
        onCancel()
    }
    const [faceDetected, setFaceDetected] = useState(false)
    const [phoneDetected, setPhoneDetected] = useState(false)
    const [lightingGood, setLightingGood] = useState(false)
    const [modelLoading, setModelLoading] = useState(false)
    const [modelLoaded, setModelLoaded] = useState(false)
    const [detectionRunning, setDetectionRunning] = useState(false)
    const [faceCount, setFaceCount] = useState(0)
    const [detectionDetails, setDetectionDetails] = useState<string>("")
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const modelRef = useRef<blazeface.BlazeFaceModel | null>(null)
    const objectModelRef = useRef<cocossd.ObjectDetection | null>(null)
    const detectionLock = useRef(false)
    const smallCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // Request permissions
    const requestPermissions = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true,
            })

            console.log("✓ Media stream obtained")
            setStream(mediaStream)
            setCameraPermission("granted")
            setMicPermission("granted")

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream

                // Ensure video plays
                videoRef.current.onloadedmetadata = async () => {
                    try {
                        await videoRef.current?.play()
                        console.log("✓ Video playing")
                        console.log("✓ Video dimensions:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight)
                    } catch (playError) {
                        console.error("Video play error:", playError)
                    }
                }
            }

            setStep("test")
        } catch (error) {
            console.error("Permission denied:", error)
            setCameraPermission("denied")
            setMicPermission("denied")
        }
    }

    // Auto-request permissions when permissions step is shown
    useEffect(() => {
        if (step === "permissions" && cameraPermission === "pending") {
            const timer = setTimeout(() => {
                requestPermissions()
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [step, cameraPermission])

    // Load TensorFlow.js and BlazeFace model
    useEffect(() => {
        const loadModel = async () => {
            if (step === "test" && !modelLoaded && !modelLoading) {
                setModelLoading(true)
                setDetectionDetails("Initializing TensorFlow.js...")
                try {
                    console.log("Loading TensorFlow.js...")

                    // CRITICAL FIX: Correct backend init order
                    await tf.setBackend('webgl')
                    await tf.ready()

                        // Expose tf to window for debugging
                        ; (window as any).tf = tf

                    console.log("TF Backend (inside app):", tf.getBackend())
                    console.log("TensorFlow.js ready!")

                    setDetectionDetails("Loading BlazeFace AI model...")
                    console.log("Loading BlazeFace model...")
                    const model = await blazeface.load()
                    modelRef.current = model
                    setModelLoaded(true)
                    setModelLoading(false)
                    setDetectionDetails("AI model loaded! Starting face detection...")
                    console.log("BlazeFace model loaded successfully!")
                } catch (error) {
                    console.error("Error loading model:", error)
                    setModelLoading(false)
                    setDetectionDetails("Error loading model. Retrying...")
                    // Retry after 2 seconds
                    setTimeout(() => {
                        setModelLoaded(false)
                        setModelLoading(false)
                    }, 2000)
                }
            }
        }

        loadModel()
    }, [step, modelLoaded, modelLoading])

    // PRODUCTION-STABLE FACE DETECTION - All 5 Critical Fixes Applied
    useEffect(() => {
        // CRITICAL FIX 5: Use ref lock instead of state to prevent double loops
        if (step !== "test" || !videoRef.current || !modelLoaded || detectionLock.current) return

        const video = videoRef.current

        // CRITICAL FIX 1: Ensure video has actual dimensions before starting
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            const wait = setInterval(() => {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                    clearInterval(wait)
                    console.log("✓ Video size:", video.videoWidth, video.videoHeight)
                }
            }, 100)
            return () => clearInterval(wait)
        }

        console.log("✓ Video size:", video.videoWidth, video.videoHeight)
        detectionLock.current = true

        let animationId: number
        let lastTime = 0

        const detectFace = async (time: number) => {
            if (!video || !modelRef.current) {
                animationId = requestAnimationFrame(detectFace)
                return
            }

            // Double-check video dimensions
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                animationId = requestAnimationFrame(detectFace)
                return
            }

            // Throttle to ~10 FPS (100ms) for stability
            if (time - lastTime < 100) {
                animationId = requestAnimationFrame(detectFace)
                return
            }
            lastTime = time

            try {
                // CRITICAL: Pass VIDEO directly, NOT canvas
                const predictions = await modelRef.current.estimateFaces(video, false)
                const numFaces = predictions.length
                setFaceCount(numFaces)

                // Debug logging
                if (Math.random() < 0.1) { // Log 10% of frames
                    console.log("🎥 Faces detected:", numFaces)
                }

                // Detailed face analysis
                if (numFaces === 0) {
                    setFaceDetected(false)
                    setDetectionDetails("No face detected. Please position yourself in front of the camera.")
                } else if (numFaces > 1) {
                    setFaceDetected(false)
                    setDetectionDetails(`${numFaces} faces detected! Only one person should be visible.`)
                } else {
                    // Exactly one face detected
                    const face = predictions[0]
                    const start = face.topLeft as [number, number]
                    const end = face.bottomRight as [number, number]
                    const faceWidth = end[0] - start[0]
                    const faceHeight = end[1] - start[1]

                    // Check face size (too small = too far, too large = too close)
                    const videoWidth = video.videoWidth
                    const videoHeight = video.videoHeight
                    const faceArea = (faceWidth * faceHeight) / (videoWidth * videoHeight)

                    if (faceArea < 0.05) {
                        setFaceDetected(false)
                        setDetectionDetails("Face too far. Please move closer to the camera.")
                    } else if (faceArea > 0.7) {
                        setFaceDetected(false)
                        setDetectionDetails("Face too close. Please move back a bit.")
                    } else {
                        // Check face position (should be centered)
                        const faceCenterX = start[0] + faceWidth / 2
                        const faceCenterY = start[1] + faceHeight / 2
                        const videoCenterX = videoWidth / 2
                        const videoCenterY = videoHeight / 2

                        const offsetX = Math.abs(faceCenterX - videoCenterX) / videoWidth
                        const offsetY = Math.abs(faceCenterY - videoCenterY) / videoHeight

                        if (offsetX > 0.25 || offsetY > 0.25) {
                            setFaceDetected(false)
                            setDetectionDetails("Please center your face in the frame.")
                        } else {
                            setFaceDetected(true)
                            setDetectionDetails("Face detected! Analyzing lighting...")

                            // Advanced lighting analysis on face region
                            const canvas = canvasRef.current || document.createElement("canvas")
                            canvas.width = videoWidth
                            canvas.height = videoHeight
                            const ctx = canvas.getContext("2d")

                            if (ctx) {
                                ctx.drawImage(video, 0, 0)

                                // Analyze lighting in face region only
                                const faceImageData = ctx.getImageData(
                                    Math.max(0, start[0]),
                                    Math.max(0, start[1]),
                                    Math.min(faceWidth, videoWidth),
                                    Math.min(faceHeight, videoHeight)
                                )

                                const data = faceImageData.data
                                let brightness = 0
                                let contrast = 0
                                const pixelCount = data.length / 4

                                // Calculate average brightness
                                for (let i = 0; i < data.length; i += 4) {
                                    brightness += (data[i] + data[i + 1] + data[i + 2]) / 3
                                }
                                brightness = brightness / pixelCount

                                // Calculate contrast (standard deviation)
                                for (let i = 0; i < data.length; i += 4) {
                                    const pixelBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3
                                    contrast += Math.pow(pixelBrightness - brightness, 2)
                                }
                                contrast = Math.sqrt(contrast / pixelCount)

                                // Lighting quality checks
                                if (brightness < 50) {
                                    setLightingGood(false)
                                    setDetectionDetails("Lighting too dark. Move to a brighter area.")
                                } else if (brightness > 220) {
                                    setLightingGood(false)
                                    setDetectionDetails("Lighting too bright. Reduce brightness or move away from direct light.")
                                } else if (contrast < 15) {
                                    setLightingGood(false)
                                    setDetectionDetails("Low contrast. Improve lighting conditions.")
                                } else {
                                    setLightingGood(true)
                                    setDetectionDetails(`✓ Perfect! Face detected with good lighting (Brightness: ${Math.round(brightness)}, Contrast: ${Math.round(contrast)})`)
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Detection error:", err)
                setDetectionDetails("Detection error. Retrying...")
            }

            // Continue detection loop
            animationId = requestAnimationFrame(detectFace)
        }

        // Start detection
        animationId = requestAnimationFrame(detectFace)

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId)
            }
            detectionLock.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, modelLoaded])

    // Cleanup stream on cancel only
    useEffect(() => {
        // We do NOT stop tracks on unmount because we pass the stream to the parent component
        return () => {
            // Optional: Check if we successfully handed over the stream?
            // For now, we trust the parent to manage the stream lifetime once passed.
        }
    }, [])

    // CRITICAL FIX: Attach stream to video when step changes to test
    useEffect(() => {
        if (step === "test" && videoRef.current && stream) {
            console.log("✓ Attaching stream to video")
            videoRef.current.srcObject = stream
            videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play().catch(e => console.error("Play error:", e))
            }
        }
    }, [step, stream])

    // Handle continue
    const handleContinue = () => {
        if (step === "intro") {
            setStep("permissions")
        } else if (step === "permissions") {
            requestPermissions()
        } else if (step === "test") {
            // Require face detection, good lighting, and NO phone
            if (faceDetected && lightingGood && modelLoaded && !phoneDetected) {
                setStep("ready")
            }
        } else if (step === "ready") {
            if (stream) {
                // Pass stream to parent instead of stopping it
                onComplete(stream)
            }
        }
    }

    return (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="border-2 border-primary max-w-2xl w-full">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <Camera className="h-6 w-6 text-primary" />
                        AI Proctoring Setup
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Intro Step */}
                    {step === "intro" && (
                        <div className="space-y-4">
                            <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
                                <h3 className="font-bold text-lg mb-2">What is AI Proctoring?</h3>
                                <p className="text-sm text-muted-foreground">
                                    AI Proctoring uses your webcam and microphone to ensure academic integrity during the quiz. Our system monitors for:
                                </p>
                                <ul className="mt-3 space-y-2 text-sm">
                                    <li className="flex items-start gap-2">
                                        <Eye className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                        <span><strong>Face Detection:</strong> Ensures only one person is taking the quiz</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Eye className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                        <span><strong>Attention Tracking:</strong> Detects if you look away from the screen</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Mic className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                        <span><strong>Audio Monitoring:</strong> Flags suspicious sounds or conversations</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                        <span><strong>Tab Switching:</strong> Automatically fails the quiz if you leave this page</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="p-4 bg-yellow-50 border-2 border-yellow-500 rounded-lg">
                                <h3 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Important Requirements
                                </h3>
                                <ul className="space-y-1 text-sm text-yellow-800">
                                    <li>• You must grant camera and microphone permissions</li>
                                    <li>• Ensure good lighting so your face is clearly visible</li>
                                    <li>• Stay centered in the camera frame</li>
                                    <li>• No other people should be in the frame</li>
                                    <li>• Minimize background noise</li>
                                </ul>
                            </div>

                            <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                                <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                                    <XCircle className="h-5 w-5" />
                                    Violations Result in Penalties
                                </h3>
                                <p className="text-sm text-red-800">
                                    Each violation decreases your Trust Score. If your Trust Score drops too low, your quiz may be flagged for review or automatically failed.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Permissions Step */}
                    {step === "permissions" && (
                        <div className="space-y-4">
                            <div className="text-center space-y-4">
                                <div className="flex justify-center">
                                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
                                        <Camera className="h-10 w-10 text-primary" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Grant Permissions</h3>
                                    <p className="text-muted-foreground mt-2">
                                        Click "Allow Permissions" to grant access to your camera and microphone
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 max-w-sm mx-auto">
                                    <div className="flex items-center justify-between p-3 border-2 border-border rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Camera className="h-5 w-5" />
                                            <span className="font-medium">Camera</span>
                                        </div>
                                        <Badge className={cameraPermission === "granted" ? "bg-green-500" : "bg-gray-400"}>
                                            {cameraPermission === "granted" ? "Granted" : "Pending"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-3 border-2 border-border rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Mic className="h-5 w-5" />
                                            <span className="font-medium">Microphone</span>
                                        </div>
                                        <Badge className={micPermission === "granted" ? "bg-green-500" : "bg-gray-400"}>
                                            {micPermission === "granted" ? "Granted" : "Pending"}
                                        </Badge>
                                    </div>
                                </div>

                                {(cameraPermission === "denied" || micPermission === "denied") && (
                                    <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                                        <p className="text-sm text-red-800">
                                            <strong>Permission Denied!</strong> You must grant camera and microphone access to take this proctored quiz.
                                            Please refresh the page and try again.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Test Step */}
                    {step === "test" && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <h3 className="text-xl font-bold mb-2">AI System Check</h3>
                                <p className="text-muted-foreground text-sm">
                                    Advanced face detection with lighting analysis
                                </p>
                            </div>

                            {/* Model Loading Indicator */}
                            {modelLoading && (
                                <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 border-2 border-blue-500 rounded-lg">
                                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">
                                        {detectionDetails || "Loading AI face detection model..."}
                                    </span>
                                </div>
                            )}

                            {/* Video Preview */}
                            <div className="relative mx-auto max-w-md">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full border-4 border-primary rounded-lg transform -scale-x-100 bg-black"
                                    style={{ minHeight: "360px" }}
                                />
                                <canvas ref={canvasRef} className="hidden" />

                                {/* Detection Overlays */}
                                <div className="absolute top-4 left-4 right-4 flex flex-col gap-2">
                                    <Badge className={faceDetected ? "bg-green-500" : "bg-yellow-500"}>
                                        {faceDetected ? (
                                            <>
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Face Detected ✓
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                {modelLoaded ? `No Valid Face (${faceCount} detected)` : "Initializing..."}
                                            </>
                                        )}
                                    </Badge>
                                    <Badge className={lightingGood ? "bg-green-500" : "bg-yellow-500"}>
                                        {lightingGood ? (
                                            <>
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Optimal Lighting ✓
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                {modelLoaded ? "Lighting Issues" : "Checking..."}
                                            </>
                                        )}
                                    </Badge>
                                </div>

                                {/* Face count indicator */}
                                {modelLoaded && faceCount > 1 && (
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <Badge className="bg-red-500 text-white w-full justify-center py-2">
                                            <Users className="h-4 w-4 mr-2" />
                                            {faceCount} People Detected - Only 1 Allowed!
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            {/* Real-time Detection Feedback */}
                            {modelLoaded && detectionDetails && (
                                <div className={`p-3 border-2 rounded-lg text-sm ${faceDetected && lightingGood
                                    ? "bg-green-50 border-green-500 text-green-800"
                                    : "bg-yellow-50 border-yellow-500 text-yellow-800"
                                    }`}>
                                    <strong>{faceDetected && lightingGood ? "✓ " : "⚠ "}</strong>
                                    {detectionDetails}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ready Step */}
                    {step === "ready" && (
                        <div className="space-y-4">
                            <div className="text-center space-y-4">
                                <div className="flex justify-center">
                                    <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-green-600">All Set!</h3>
                                    <p className="text-muted-foreground mt-2">
                                        Your system check is complete. You're ready to begin the proctored quiz.
                                    </p>
                                </div>

                                <div className="p-4 bg-green-50 border-2 border-green-500 rounded-lg text-sm text-green-800">
                                    <strong>Remember:</strong> AI proctoring will monitor you throughout the quiz. Stay focused, keep your face visible, and avoid suspicious behavior.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t-2 border-border">
                        <Button
                            onClick={handleCancel}
                            variant="outline"
                            className="flex-1 border-2 border-border font-bold"
                            disabled={step === "permissions" && cameraPermission === "pending"}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleContinue}
                            className="flex-1 bg-primary text-primary-foreground border-2 border-primary font-bold"
                            disabled={
                                (step === "permissions" && cameraPermission !== "granted") ||
                                (step === "test" && (!faceDetected || !lightingGood || !modelLoaded))
                            }
                        >
                            {step === "intro" && "Continue"}
                            {step === "permissions" && "Allow Permissions"}
                            {step === "test" && (
                                modelLoading ? "Loading AI Model..." :
                                    !modelLoaded ? "Initializing..." :
                                        (faceDetected && lightingGood) ? "Continue" : "Waiting for Detection..."
                            )}
                            {step === "ready" && "Start Quiz"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
