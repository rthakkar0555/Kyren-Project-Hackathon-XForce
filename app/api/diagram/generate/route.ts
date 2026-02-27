import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const DIAGRAM_SYSTEM_PROMPT = `You are an expert system architect and diagram designer. Your ONLY job is to output valid Excalidraw JSON diagrams.

CRITICAL: Return ONLY raw JSON. No markdown code blocks, no explanation text, no preamble. Just the raw JSON object starting with { and ending with }.

The JSON must follow this exact structure:
{
  "type": "excalidraw",
  "version": 2,
  "source": "diagram-copilot",
  "elements": [
    {
      "id": "unique-string-id",
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 160,
      "height": 60,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#a5d8ff",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "roundness": { "type": 3 },
      "seed": 12345,
      "version": 1,
      "versionNonce": 1,
      "isDeleted": false,
      "boundElements": [{ "type": "text", "id": "label-id" }],
      "updated": 1,
      "link": null,
      "locked": false
    },
    {
      "id": "label-id",
      "type": "text",
      "x": 110,
      "y": 120,
      "width": 140,
      "height": 20,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 0,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "roundness": null,
      "seed": 12346,
      "version": 1,
      "versionNonce": 1,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1,
      "link": null,
      "locked": false,
      "text": "Component Name",
      "fontSize": 16,
      "fontFamily": 1,
      "textAlign": "center",
      "verticalAlign": "middle",
      "baseline": 14,
      "containerId": "unique-string-id",
      "originalText": "Component Name",
      "lineHeight": 1.25
    }
  ],
  "appState": {
    "gridSize": null,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}

DESIGN RULES:
1. Use short unique IDs like "rect-1", "rect-2", "arrow-1", "text-1" etc.
2. For each rectangle/shape that has a label, create TWO elements: the shape + a text element with containerId pointing to the shape
3. For arrows between shapes use type "arrow" with points array. Add startBinding and endBinding.
4. Color palette:
   - Frontend/UI: backgroundColor "#a5d8ff" (light blue)
   - Backend/API: backgroundColor "#b2f2bb" (light green)  
   - Database/Storage: backgroundColor "#ffd8a8" (light orange)
   - Cache/Queue: backgroundColor "#e9d8fd" (light purple)
   - External Services: backgroundColor "#ffc9c9" (light red)
   - All strokeColor: "#1e1e1e"
5. Spacing: at least 80px between components horizontally, 60px vertically
6. Arrows must have arrowhead at end: "endArrowhead": "arrow", "startArrowhead": null
7. Layout: top-to-bottom or left-to-right flow for clarity
8. Minimum 5 elements, maximum 40 elements
9. Use roughness: 0 for clean look
10. For arrow points use relative coordinates in the points array from the arrow's x,y origin

ARROW STRUCTURE:
{
  "id": "arrow-1",
  "type": "arrow",
  "x": 280,
  "y": 130,
  "width": 80,
  "height": 0,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "roundness": { "type": 2 },
  "seed": 99,
  "version": 1,
  "versionNonce": 1,
  "isDeleted": false,
  "boundElements": null,
  "updated": 1,
  "link": null,
  "locked": false,
  "points": [[0, 0], [80, 0]],
  "lastCommittedPoint": null,
  "startBinding": { "elementId": "rect-1", "focus": 0, "gap": 8 },
  "endBinding": { "elementId": "rect-2", "focus": 0, "gap": 8 },
  "startArrowhead": null,
  "endArrowhead": "arrow"
}
`

function parseExcalidrawJSON(text: string): object {
    // Try to extract JSON from the response text
    let jsonStr = text.trim()

    // Remove markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim()
    }

    // Find the first { and last } to extract pure JSON
    const startIdx = jsonStr.indexOf('{')
    const lastIdx = jsonStr.lastIndexOf('}')
    if (startIdx !== -1 && lastIdx !== -1) {
        jsonStr = jsonStr.slice(startIdx, lastIdx + 1)
    }

    return JSON.parse(jsonStr)
}

function validateDiagram(diagram: any): void {
    if (!diagram || typeof diagram !== 'object') {
        throw new Error('Invalid diagram: not an object')
    }
    if (!Array.isArray(diagram.elements)) {
        throw new Error('Invalid diagram: missing elements array')
    }
    if (diagram.elements.length < 2) {
        throw new Error('Diagram must have at least 2 elements')
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { prompt } = body

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: DIAGRAM_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Create a clear visual diagram for: ${prompt}\n\nRemember: Return ONLY raw JSON, no explanation.`
                }
            ],
            temperature: 0.3,
            max_tokens: 4000,
        })

        const responseText = response.choices[0]?.message?.content || ''

        const diagram = parseExcalidrawJSON(responseText)
        validateDiagram(diagram)

        return NextResponse.json({ diagram, success: true })

    } catch (error) {
        console.error('Diagram generate error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate diagram' },
            { status: 500 }
        )
    }
}
