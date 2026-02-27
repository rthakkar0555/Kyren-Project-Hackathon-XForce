import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const LAYOUT_SYSTEM_PROMPT = `You are an expert diagram layout optimizer. You receive an Excalidraw JSON diagram and must reorganize the layout for better visual clarity.

CRITICAL: Return ONLY raw JSON. No markdown, no explanation.

Your rules:
1. Keep ALL elements — do NOT add or remove any elements
2. Keep all element IDs, labels, text content, colors, and types IDENTICAL
3. ONLY change x and y coordinates to improve layout
4. Arrange components in a clear top-to-bottom or left-to-right hierarchy
5. Group related components visually (e.g., frontend together, backend together, databases together)
6. Use 80-120px gaps between components
7. Start from x=100, y=100 and expand rightward and downward
8. Update arrow points array to match new positions of connected elements
9. Maintain at least 100px separation between logical groups
10. Return the complete Excalidraw JSON with all elements (only x/y/points modified)
`

function parseExcalidrawJSON(text: string): object {
    let jsonStr = text.trim()
    const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim()
    }
    const startIdx = jsonStr.indexOf('{')
    const lastIdx = jsonStr.lastIndexOf('}')
    if (startIdx !== -1 && lastIdx !== -1) {
        jsonStr = jsonStr.slice(startIdx, lastIdx + 1)
    }
    return JSON.parse(jsonStr)
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { currentDiagram } = body

        if (!currentDiagram) {
            return NextResponse.json({ error: 'currentDiagram is required' }, { status: 400 })
        }

        const userPrompt = `Reorganize the layout of this Excalidraw diagram for better visual clarity:
${JSON.stringify(currentDiagram, null, 2)}

Return ONLY the complete reorganized Excalidraw JSON with the same elements but improved positioning.`

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: LAYOUT_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 4000,
        })

        const responseText = response.choices[0]?.message?.content || ''
        const diagram = parseExcalidrawJSON(responseText)

        if (!diagram || !(diagram as any).elements) {
            throw new Error('Invalid diagram response from AI')
        }

        return NextResponse.json({ diagram, success: true })

    } catch (error) {
        console.error('Diagram regenerate-layout error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to regenerate layout' },
            { status: 500 }
        )
    }
}
