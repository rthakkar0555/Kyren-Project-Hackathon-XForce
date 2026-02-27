import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { imageData } = body

        if (!imageData) {
            return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
        }

        console.log('Starting OCR processing with GPT-4o Vision...')

        // Use GPT-4o for multimodal OCR (reliable fallback since OpenAI is configured)
        const { text: extractedText, usage } = await generateText({
            model: openai('gpt-4o'),
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Transcribe the text in this image exactly as written. Return ONLY the transcribed text. Do not add any conversational filler.' },
                        { type: 'image', image: imageData },
                    ],
                },
            ],
            maxTokens: 1000,
        })

        const cleanedText = extractedText.trim()
        console.log('OCR completed. Text length:', cleanedText.length)
        console.log('Extracted Text:', cleanedText.substring(0, 50) + '...')

        // Track API usage
        try {
            const { logAPIUsage } = await import('@/lib/api-usage-tracker')
            await logAPIUsage({
                userId: user.id,
                endpoint: '/api/ocr',
                serviceName: 'openai_gpt', // Log as OpenAI usage
                modelName: 'gpt-4o',
                metadata: {
                    textLength: cleanedText.length,
                    inputTokens: usage.promptTokens,
                    outputTokens: usage.completionTokens
                }
            })
        } catch (logError) {
            console.warn('Failed to log API usage:', logError)
        }

        return NextResponse.json({
            success: true,
            text: cleanedText,
            confidence: 95, // Gemini doesn't provide confidence, but it's typically high
            wordCount: cleanedText.split(/\s+/).length
        })

    } catch (error: any) {
        console.error('OCR error:', error)

        return NextResponse.json({
            error: 'Failed to process image',
            details: error.message || 'Unknown error'
        }, { status: 500 })
    }
}
