import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const MODIFY_SYSTEM_PROMPT = `You are an expert diagram editor. You receive an existing Excalidraw JSON diagram and modification instructions.

CRITICAL: Return ONLY raw JSON. No markdown, no explanation. Just the JSON object.

Your rules:
1. Keep all existing elements that are not being changed — preserve their IDs exactly
2. Add new elements with new unique IDs (e.g., "rect-new-1", "arrow-new-1")
3. For removed elements, set "isDeleted": true rather than omitting them
4. Maintain the same Excalidraw JSON structure as the input
5. When adding a new labeled box, add BOTH the shape element AND its text element with containerId
6. Use the same color conventions:
   - Frontend/UI: backgroundColor "#a5d8ff"
   - Backend/API: backgroundColor "#b2f2bb"
   - Database/Storage: backgroundColor "#ffd8a8"
   - Cache/Queue: backgroundColor "#e9d8fd"
   - External Services: backgroundColor "#ffc9c9"
7. New arrows must include proper startBinding and endBinding
8. Place new elements near relevant existing ones with proper spacing (80px gap)
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
        const { instruction, currentDiagram } = body

        if (!instruction || !currentDiagram) {
            return NextResponse.json(
                { error: 'instruction and currentDiagram are required' },
                { status: 400 }
            )
        }

        const userPrompt = `Current Excalidraw diagram JSON:
${JSON.stringify(currentDiagram, null, 2)}

Modification instruction:
${instruction}

Apply the changes and return the complete updated Excalidraw JSON. Return ONLY the raw JSON.`

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: MODIFY_SYSTEM_PROMPT },
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
        console.error('Diagram modify error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to modify diagram' },
            { status: 500 }
        )
    }
}
