import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { preprocessTextForTTS, selectVoiceForLanguage, type Language, type Voice } from '@/lib/tts-utils'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

const MAX_CHARS = 4000 // OpenAI limit is 4096, use 4000 for safety

/**
 * Split text into chunks at sentence boundaries
 */
function chunkText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
        return [text]
    }

    const chunks: string[] = []
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    let currentChunk = ''

    for (const sentence of sentences) {
        // If single sentence is too long, split by words
        if (sentence.length > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk.trim())
                currentChunk = ''
            }

            const words = sentence.split(' ')
            for (const word of words) {
                if ((currentChunk + ' ' + word).length > maxLength) {
                    chunks.push(currentChunk.trim())
                    currentChunk = word
                } else {
                    currentChunk += (currentChunk ? ' ' : '') + word
                }
            }
        } else if ((currentChunk + sentence).length > maxLength) {
            chunks.push(currentChunk.trim())
            currentChunk = sentence
        } else {
            currentChunk += sentence
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim())
    }

    return chunks
}

/**
 * Merge audio buffers
 */
function mergeAudioBuffers(buffers: Buffer[]): Buffer {
    return Buffer.concat(buffers)
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { text, language = 'english', voice, speed = 1.0, lessonId } = body

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 })
        }

        // 1. Check Cache (if lessonId provided)
        if (lessonId) {
            const { data: lesson } = await supabase
                .from('lessons')
                .select('summary_audio_url')
                .eq('id', lessonId)
                .single()

            if (lesson?.summary_audio_url) {
                console.log(`[TTS] Cache hit for lesson ${lessonId}`)
                // Redirect to signed/public URL or fetch and stream?
                // Depending on storage privacy. Assuming public bucket from migration.
                // Fetch the URL and stream it back to simple valid the existing frontend logic that expects a blob
                const audioRes = await fetch(lesson.summary_audio_url)
                if (audioRes.ok) {
                    const audioBuffer = await audioRes.arrayBuffer()
                    return new NextResponse(audioBuffer, {
                        headers: {
                            'Content-Type': 'audio/mpeg',
                            'Content-Length': audioBuffer.byteLength.toString(),
                            'Cache-Control': 'public, max-age=31536000, immutable'
                        }
                    })
                }
            }
        }

        // Validate language
        const validLanguage: Language = language === 'hindi' ? 'hindi' : 'english'

        // Preprocess text for natural narration
        const processedText = preprocessTextForTTS(text, validLanguage)

        // Select appropriate voice
        const selectedVoice = selectVoiceForLanguage(validLanguage, voice as Voice)

        // Validate speed
        const validSpeed = Math.max(0.25, Math.min(4.0, speed))

        // Split text into chunks if needed
        const chunks = chunkText(processedText, MAX_CHARS)

        console.log(`Processing ${chunks.length} chunk(s) for TTS`)

        // Generate audio for each chunk
        const audioBuffers: Buffer[] = []

        for (let i = 0; i < chunks.length; i++) {
            console.log(`Generating audio for chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`)

            const mp3Response = await openai.audio.speech.create({
                model: 'tts-1',
                voice: selectedVoice,
                input: chunks[i],
                speed: validSpeed
            })

            const buffer = Buffer.from(await mp3Response.arrayBuffer())
            audioBuffers.push(buffer)
        }

        // Merge all audio buffers
        const finalBuffer = mergeAudioBuffers(audioBuffers)

        console.log(`TTS complete: ${finalBuffer.length} bytes`)

        // 2. Upload to Storage & Update DB (if lessonId provided)
        if (lessonId) {
            try {
                const fileName = `${lessonId}-${Date.now()}.mp3`
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('lesson-audio')
                    .upload(fileName, finalBuffer, {
                        contentType: 'audio/mpeg',
                        upsert: true
                    })

                if (uploadError) {
                    console.error('[TTS] Storage upload failed:', uploadError)
                } else {
                    const { data: { publicUrl } } = supabase
                        .storage
                        .from('lesson-audio')
                        .getPublicUrl(fileName)

                    await supabase
                        .from('lessons')
                        .update({ summary_audio_url: publicUrl })
                        .eq('id', lessonId)

                    console.log(`[TTS] Cached audio for lesson ${lessonId} at ${publicUrl}`)
                }
            } catch (cacheError) {
                console.error('[TTS] Cache update failed:', cacheError)
                // Continue to return audio even if caching fails
            }
        }

        // Track API usage
        const { logAPIUsage } = await import('@/lib/api-usage-tracker')
        await logAPIUsage({
            userId: user.id,
            endpoint: '/api/lessons/tts',
            serviceName: 'openai_tts',
            modelName: 'tts-1',
            characterCount: processedText.length,
            metadata: {
                language: validLanguage,
                voice: selectedVoice,
                chunks: chunks.length
            }
        })

        // Return audio file
        return new NextResponse(finalBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': finalBuffer.length.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        })

    } catch (error: any) {
        console.error('TTS error:', error)

        return NextResponse.json({
            error: 'Failed to generate audio',
            details: error.message || 'Unknown error'
        }, { status: 500 })
    }
}
