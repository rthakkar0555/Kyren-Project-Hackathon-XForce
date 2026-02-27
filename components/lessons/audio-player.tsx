"use client"

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { formatDuration } from '@/lib/tts-utils'

interface AudioPlayerProps {
    audioUrl: string
    onClose?: () => void
}

export default function AudioPlayer({ audioUrl, onClose }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const updateTime = () => setCurrentTime(audio.currentTime)
        const updateDuration = () => setDuration(audio.duration)
        const handleEnded = () => setIsPlaying(false)

        audio.addEventListener('timeupdate', updateTime)
        audio.addEventListener('loadedmetadata', updateDuration)
        audio.addEventListener('ended', handleEnded)

        return () => {
            audio.removeEventListener('timeupdate', updateTime)
            audio.removeEventListener('loadedmetadata', updateDuration)
            audio.removeEventListener('ended', handleEnded)
        }
    }, [])

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio) return

        if (isPlaying) {
            audio.pause()
        } else {
            audio.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleSeek = (value: number[]) => {
        const audio = audioRef.current
        if (!audio) return
        audio.currentTime = value[0]
        setCurrentTime(value[0])
    }

    const handleVolumeChange = (value: number[]) => {
        const audio = audioRef.current
        if (!audio) return
        const newVolume = value[0]
        audio.volume = newVolume
        setVolume(newVolume)
        setIsMuted(newVolume === 0)
    }

    const toggleMute = () => {
        const audio = audioRef.current
        if (!audio) return

        if (isMuted) {
            audio.volume = volume || 0.5
            setIsMuted(false)
        } else {
            audio.volume = 0
            setIsMuted(true)
        }
    }

    const handleSpeedChange = (speed: string) => {
        const audio = audioRef.current
        if (!audio) return
        const newSpeed = parseFloat(speed)
        audio.playbackRate = newSpeed
        setPlaybackSpeed(newSpeed)
    }

    const handleDownload = () => {
        const link = document.createElement('a')
        link.href = audioUrl
        link.download = 'lesson-summary.mp3'
        link.click()
    }

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    return (
        <div className="border-2 border-border p-4 space-y-4">
            <audio ref={audioRef} src={audioUrl} preload="metadata" />

            {/* Progress Bar */}
            <div className="space-y-2">
                <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="cursor-pointer"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDuration(Math.floor(currentTime))}</span>
                    <span>{formatDuration(Math.floor(duration))}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <Button
                    onClick={togglePlay}
                    size="icon"
                    className="h-10 w-10"
                >
                    {isPlaying ? (
                        <Pause className="h-4 w-4" />
                    ) : (
                        <Play className="h-4 w-4" />
                    )}
                </Button>

                {/* Volume */}
                <div className="flex items-center gap-2 flex-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className="h-8 w-8"
                    >
                        {isMuted ? (
                            <VolumeX className="h-4 w-4" />
                        ) : (
                            <Volume2 className="h-4 w-4" />
                        )}
                    </Button>
                    <Slider
                        value={[isMuted ? 0 : volume]}
                        max={1}
                        step={0.01}
                        onValueChange={handleVolumeChange}
                        className="w-24"
                    />
                </div>

                {/* Speed */}
                <Select value={playbackSpeed.toString()} onValueChange={handleSpeedChange}>
                    <SelectTrigger className="w-20 h-8 text-xs border-2 border-border">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="1.25">1.25x</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                    </SelectContent>
                </Select>

                {/* Download */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDownload}
                    className="h-8 w-8 border-2 border-border"
                >
                    <Download className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
