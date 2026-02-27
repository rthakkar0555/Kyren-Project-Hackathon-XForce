"use client"

import { useState } from 'react'
import { Volume2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import AudioPlayer from './audio-player'
import { type Voice } from '@/lib/tts-utils'
import { toast } from 'sonner'

interface SummaryTTSProps {
    summaryText: string
    lessonId?: string
    initialAudioUrl?: string | null
}

const ENGLISH_VOICES: Voice[] = ['nova', 'alloy', 'echo', 'fable', 'onyx', 'shimmer']

export default function SummaryTTS({ summaryText, lessonId, initialAudioUrl }: SummaryTTSProps) {
    const [isGenerating, setIsGenerating] = useState(false)
    const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null)
    const [voice, setVoice] = useState<Voice>('nova')
    const [showVoiceSelector, setShowVoiceSelector] = useState(false)

    const generateAudio = async () => {
        setIsGenerating(true)

        try {
            const response = await fetch('/api/lessons/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: summaryText,
                    language: 'english',
                    voice,
                    speed: 1.0,
                    lessonId // Pass lessonId for caching
                })
            })

            if (!response.ok) {
                throw new Error('Failed to generate audio')
            }

            const blob = await response.blob()
            const url = URL.createObjectURL(blob)

            setAudioUrl(url)
            setShowVoiceSelector(false)
            toast.success('Audio ready!')
        } catch (error) {
            console.error('TTS error:', error)
            toast.error('Failed to generate audio. Please try again.')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleClose = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl)
            setAudioUrl(null)
        }
        setShowVoiceSelector(false)
    }

    return (
        <div className="space-y-4">
            {/* Initial State - Generate Button */}
            {!showVoiceSelector && !audioUrl && (
                <Button
                    onClick={() => setShowVoiceSelector(true)}
                    variant="outline"
                    className="w-full border-2 border-border"
                >
                    <Volume2 className="mr-2 h-4 w-4" />
                    Generate Audio
                </Button>
            )}

            {/* Voice Selection */}
            {showVoiceSelector && !audioUrl && (
                <div className="space-y-3">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Voice</label>
                        <Select value={voice} onValueChange={(v) => setVoice(v as Voice)}>
                            <SelectTrigger className="border-2 border-border">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ENGLISH_VOICES.map((v) => (
                                    <SelectItem key={v} value={v}>
                                        {v.charAt(0).toUpperCase() + v.slice(1)}
                                        {v === 'nova' && ' (Recommended)'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={generateAudio}
                            disabled={isGenerating}
                            className="flex-1"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Volume2 className="mr-2 h-4 w-4" />
                                    Generate
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={handleClose}
                            variant="outline"
                            className="border-2 border-border"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Audio Player */}
            {audioUrl && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Voice: {voice.charAt(0).toUpperCase() + voice.slice(1)}</span>
                        <Button
                            onClick={handleClose}
                            variant="ghost"
                            size="sm"
                        >
                            Close
                        </Button>
                    </div>
                    <AudioPlayer audioUrl={audioUrl} onClose={handleClose} />
                </div>
            )}
        </div>
    )
}
