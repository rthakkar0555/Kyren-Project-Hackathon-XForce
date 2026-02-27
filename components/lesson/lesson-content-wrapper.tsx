"use client"

import LessonContent from '@/components/lesson/lesson-content'
import SummaryTTS from '@/components/lessons/summary-tts'

interface LessonContentWrapperProps {
    lesson: any
}

export default function LessonContentWrapper({ lesson }: LessonContentWrapperProps) {
    return (
        <div className="space-y-6">
            {/* Lesson Content */}
            <LessonContent lesson={lesson} />

            {/* Text-to-Speech Controls - Matching website theme */}
            {lesson.content && (
                <div className="border-2 border-border p-6 space-y-4">
                    <h2 className="text-xl font-bold">🎧 Listen to Summary</h2>
                    <p className="text-sm text-muted-foreground">
                        Listen to this lesson with natural AI voice narration
                    </p>
                    <SummaryTTS
                        summaryText={lesson.content}
                        lessonId={lesson.id}
                        initialAudioUrl={lesson.summary_audio_url}
                    />
                </div>
            )}
        </div>
    )
}
