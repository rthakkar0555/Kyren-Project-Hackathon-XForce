"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayCircle, Youtube, CheckCircle2 } from "lucide-react"

interface VideoSuggestion {
    title: string
    searchQuery?: string
    channelName?: string
    videoId?: string
    thumbnailUrl?: string
    description?: string
    channelTitle?: string
}

interface VideoPlayerProps {
    suggestions: VideoSuggestion[]
    courseId?: string
    lessonId?: string
    isCompleted?: boolean
}

export default function VideoPlayer({ suggestions, courseId, lessonId, isCompleted = false }: VideoPlayerProps) {
    const [activeVideo, setActiveVideo] = useState<VideoSuggestion | null>(suggestions[0] || null)
    const [completed, setCompleted] = useState(isCompleted)
    const [loading, setLoading] = useState(false)

    // Track unique watched video indices
    const [watchedIndices, setWatchedIndices] = useState<Set<number>>(new Set([0]))

    // Add current video to watched list when it changes
    useEffect(() => {
        if (activeVideo) {
            const idx = suggestions.indexOf(activeVideo)
            if (idx !== -1) {
                setWatchedIndices(prev => {
                    const newSet = new Set(prev)
                    newSet.add(idx)
                    return newSet
                })
            }
        }
    }, [activeVideo, suggestions])

    const handleMarkComplete = async () => {
        if (!courseId || !lessonId) return
        setLoading(true)
        try {
            await fetch(`/api/courses/${courseId.trim()}/lessons/${lessonId.trim()}/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "video" })
            })
            setCompleted(true)
        } catch (error) {
            console.error("Failed to mark complete", error)
        } finally {
            setLoading(false)
        }
    }

    const allVideosWatched = watchedIndices.size === suggestions.length

    if (!suggestions.length) return null

    const getEmbedUrl = (video: VideoSuggestion) => {
        if (video.videoId) {
            return `https://www.youtube.com/embed/${video.videoId}?autoplay=1`
        }
        return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(video.searchQuery || video.title)}`
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Youtube className="h-8 w-8 text-red-600" />
                <h2 className="text-2xl font-bold">Recommended Videos</h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Player */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="border-2 border-border overflow-hidden bg-black aspect-video relative group">
                        {activeVideo ? (
                            <iframe
                                src={getEmbedUrl(activeVideo)}
                                title={activeVideo.title}
                                className="w-full h-full absolute inset-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p>Select a video to play</p>
                            </div>
                        )}
                    </Card>
                    {activeVideo && (
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold">{activeVideo.title}</h3>
                                {activeVideo.channelName || activeVideo.channelTitle ? (
                                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                        via {activeVideo.channelName || activeVideo.channelTitle}
                                    </p>
                                ) : null}
                            </div>

                            {courseId && lessonId && (
                                <div className="flex flex-col items-end gap-2">
                                    <Button
                                        onClick={handleMarkComplete}
                                        disabled={completed || loading || !allVideosWatched}
                                        variant={completed ? "secondary" : "default"}
                                        className={completed ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200" : ""}
                                    >
                                        {loading ? "Updating..." : completed ? (
                                            <>
                                                <span className="mr-2">✓</span> Lesson Completed
                                            </>
                                        ) : (
                                            <>
                                                {allVideosWatched ? "Mark Lesson as Completed" : `Watch All Videos (${watchedIndices.size}/${suggestions.length})`}
                                            </>
                                        )}
                                    </Button>
                                    {!allVideosWatched && !completed && (
                                        <p className="text-xs text-muted-foreground">
                                            You must watch all {suggestions.length} videos to complete this lesson.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Playlist */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    <h3 className="font-semibold text-muted-foreground mb-4">Up Next</h3>
                    {suggestions.map((video, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveVideo(video)}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all group flex gap-3 items-start ${activeVideo === video
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                                }`}
                        >
                            <div className="mt-1 relative">
                                <PlayCircle
                                    className={`h-5 w-5 ${activeVideo === video ? "text-primary fill-primary/20" : "text-muted-foreground group-hover:text-primary"}`}
                                />
                                {watchedIndices.has(idx) && (
                                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-[1px]">
                                        <CheckCircle2 className="h-3 w-3 text-white" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className={`font-medium line-clamp-2 ${activeVideo === video ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                                    {video.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {video.channelName || video.channelTitle || "YouTube Suggestion"}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
