/**
 * Text-to-Speech Utility Functions
 * Preprocesses text for natural-sounding narration
 */

export type Language = 'english' | 'hindi'
export type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

// Voice recommendations for each language
export const VOICE_OPTIONS: Record<Language, Voice[]> = {
    english: ['nova', 'alloy', 'echo', 'fable', 'onyx', 'shimmer'],
    hindi: ['alloy', 'nova', 'shimmer']
}

// Default voices
export const DEFAULT_VOICES: Record<Language, Voice> = {
    english: 'nova',
    hindi: 'alloy'
}

/**
 * Detect language from text content
 */
export function detectLanguage(text: string): Language {
    // Check for Devanagari script (Hindi)
    const hindiPattern = /[\u0900-\u097F]/
    return hindiPattern.test(text) ? 'hindi' : 'english'
}

/**
 * Add natural pauses to text for better narration
 */
export function addNaturalPauses(text: string): string {
    return text
        // Paragraph breaks - longest pause
        .replace(/\n\n+/g, '\n\n[PAUSE:800]\n\n')

        // Sentence endings - medium pause
        .replace(/\. /g, '. [PAUSE:500] ')
        .replace(/\? /g, '? [PAUSE:600] ')
        .replace(/! /g, '! [PAUSE:600] ')

        // Clause separators - short pause
        .replace(/: /g, ': [PAUSE:300] ')
        .replace(/; /g, '; [PAUSE:400] ')
        .replace(/, /g, ', [PAUSE:200] ')

        // List items - medium pause
        .replace(/\n- /g, '\n[PAUSE:400]- ')
        .replace(/\n\d+\. /g, '\n[PAUSE:400]')

        // Headings - longer pause before
        .replace(/\n#+\s/g, '\n[PAUSE:700]')
}

/**
 * Clean and preprocess text for TTS
 */
export function preprocessTextForTTS(text: string, language: Language): string {
    let processed = text

    // Remove markdown formatting
    processed = processed
        .replace(/#{1,6}\s/g, '') // Remove heading markers
        .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.+?)\*/g, '$1') // Remove italic
        .replace(/`(.+?)`/g, '$1') // Remove code markers
        .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Convert links to just text

    // Clean up special characters
    processed = processed
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, 'and')
        .replace(/&lt;/g, 'less than')
        .replace(/&gt;/g, 'greater than')

    // Add natural pauses
    processed = addNaturalPauses(processed)

    // Clean up multiple spaces
    processed = processed.replace(/\s+/g, ' ').trim()

    return processed
}

/**
 * Select appropriate voice for language
 */
export function selectVoiceForLanguage(language: Language, preferredVoice?: Voice): Voice {
    if (preferredVoice && VOICE_OPTIONS[language].includes(preferredVoice)) {
        return preferredVoice
    }
    return DEFAULT_VOICES[language]
}

/**
 * Estimate audio duration (approximate)
 */
export function estimateAudioDuration(text: string, speed: number = 1.0): number {
    // Average speaking rate: ~150 words per minute
    const words = text.split(/\s+/).length
    const baseMinutes = words / 150
    const adjustedMinutes = baseMinutes / speed
    return Math.ceil(adjustedMinutes * 60) // Return seconds
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
}
