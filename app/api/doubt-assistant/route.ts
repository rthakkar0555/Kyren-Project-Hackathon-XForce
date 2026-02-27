import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { classifySubject, getSubjectPrompt } from '@/lib/subject-classifier'
import { parseDoubtResponse, validateResponse, generateFallbackResponse, normalizeOCRText, formatStepByStepSolution } from '@/lib/doubt-formatter'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

const SYSTEM_PROMPT = `You are an AI-powered educational doubt-clearing assistant.

YOUR GOAL: Provide a structured, "textbook-quality" step-by-step solution that is easy to read and mathematically precise.

---------------------------------
CORE INSTRUCTIONS
---------------------------------

1.  **Format Like a Textbook**:
    -   Use **bold** for key actions or logical steps (e.g., "**Rewrite the equation:**", "**Factor out:**", "**Substitute:**").
    -   Use LaTeX for ALL mathematical expressions, equations, and variables (e.g., \\( x^2 \\), \\( 3^x - 3^y = 234 \\)).
    -   Ensure plenty of whitespace between steps for readability.

2.  **Structure of the Solution**:
    -   Start immediately with the solution steps. Do not give a long intro.
    -   Break down complex logic into clear, discrete lines.
    -   For case analysis (e.g., "Case 1", "Case 2"), use clear headers or bullet points.
    -   End with a clear verification or conclusion.

3.  **Tone & Style**:
    -   Direct, imperative, and professional.
    -   Avoid "Here is the answer" filler.
    -   Focus on the *logic* of the derivation.

---------------------------------
OUTPUT FORMAT REQUIRMENTS
---------------------------------

You must strictly match this structure:

[Detected Subject]: <Subject Name>
(Verify the subject yourself based on the question content. Do not blindly follow the system context if the question clearly belongs to another subject like Physics or Chemistry).

[Corrected Question]:
<Clean, normalized version of the question in LaTeX if needed>

[Quick Answer]:
<A concise direct answer (result only) or classification>

[Step-by-Step Solution]:

**Step 1: <Action Name>**
<Explanation using \\( LaTeX \\) for math>

**Step 2: <Action Name>**
<Explanation>

**Step 3: <Action Name>**
<Explanation>

(Continue with each step on a NEW LINE, with a BLANK LINE after each step's explanation)

[Final Answer]:
\\[ \\boxed{\\text{The final result}} \\]
or
\\( x = 5, y = 2 \\)


[Related Concepts]:
- <Concept 1>
- <Concept 2>

[Try This Next]:
<A similar practice problem>

---------------------------------
EXAMPLE OF DESIRED STYLE (MATH)
---------------------------------

**Step 1: Rewrite the equation**
\\( 3^x - 3^y = 234 \\).

**Step 2: Factor out \\( 3^y \\)**
\\( 3^y (3^{x-y} - 1) = 234 \\).

**Step 3: Substitute \\( k = x - y \\)**
Then we have \\( 3^y (3^k - 1) = 234 \\).

**Step 4: Analyze factors**
We look for integer solutions. Since 234 is even, \\( 3^y (3^k - 1) \\) must match factors of 234.
-   \\( 234 = 2 \\times 3^2 \\times 13 \\).
-   Comparing powers of 3: \\( 3^y = 3^2 \\implies y = 2 \\).

**Step 5: Solve for \\( k \\)**
\\( 3^k - 1 = \\frac{234}{9} = 26 \\implies 3^k = 27 \\implies k = 3 \\).

**Step 6: Find \\( x \\)**
\\( x = y + k = 2 + 3 = 5 \\).

**Step 7: Verification**
\\( 3^5 - 3^2 = 243 - 9 = 234 \\). ✓

**Final Answer:**
\\[ \\boxed{(x, y) = (5, 2)} \\]

---------------------------------
MANDATORY RULES
---------------------------------
-   **LaTeX everything**: Even single variables like \\( x \\) or \\( y \\).
-   **Bold key terms**: Make the logic skimming-friendly.
-   **No Hallucinations**: Verify every step internally before outputting.
-   **Complexity Theory**: If P vs NP, justify reductions formally.
-   **CRITICAL - Line Breaks**: Each **Step N:** MUST start on a NEW LINE. Add a blank line after each step's explanation before the next step.
-   **Spacing**: Use blank lines generously to separate logical blocks.
-   **Final Answer Format**: ALWAYS use \\[ \\boxed{...} \\] for the final answer. Never use plain text like "[ \\boxed{...} ]".
`

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { question, type, ocrText } = body

        if (!question && !ocrText) {
            return NextResponse.json({ error: 'Question is required' }, { status: 400 })
        }

        // Use OCR text if provided, otherwise use question
        let finalQuestion = question || ocrText

        // Normalize OCR text if it came from image
        if (type === 'image' && ocrText) {
            finalQuestion = normalizeOCRText(ocrText)
        }

        // Classify subject
        const { subject } = classifySubject(finalQuestion)
        const subjectPrompt = getSubjectPrompt(subject)

        // RAG Logic Removed as per user request
        // We now rely solely on the model's internal knowledge

        // Create a streaming response
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Generate AI response using OpenAI GPT-4o-mini
                    const completion = await openai.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'system',
                                content: SYSTEM_PROMPT + '\n\n' + subjectPrompt
                            },
                            {
                                role: 'user',
                                content: `Now answer this question:\n${finalQuestion}`
                            }
                        ],
                        temperature: 0.5,
                        max_tokens: 2048, // Increased tokens for detailed explanations
                        stream: true
                    })

                    let fullResponse = ''
                    let outputTokens = 0

                    // Stream the response
                    for await (const chunk of completion) {
                        const content = chunk.choices[0]?.delta?.content || ''
                        if (content) {
                            fullResponse += content
                            outputTokens++

                            // Send the chunk to the client
                            const data = JSON.stringify({
                                type: 'chunk',
                                content: content
                            })
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                        }
                    }

                    // Parse the complete response
                    let parsedResponse = parseDoubtResponse(fullResponse)

                    // Validate and use fallback if needed
                    if (!validateResponse(parsedResponse)) {
                        parsedResponse = generateFallbackResponse(finalQuestion, subject)
                    }

                    // Format step-by-step solution
                    parsedResponse.stepByStepSolution = formatStepByStepSolution(parsedResponse.stepByStepSolution)

                    // Track API usage
                    try {
                        const { logAPIUsage } = await import('@/lib/api-usage-tracker')
                        await logAPIUsage({
                            userId: user.id,
                            endpoint: '/api/doubt-assistant',
                            serviceName: 'openai_gpt',
                            modelName: 'gpt-4o-mini',
                            inputTokens: Math.ceil((SYSTEM_PROMPT.length + finalQuestion.length) / 4),
                            outputTokens: Math.ceil(fullResponse.length / 4),
                            metadata: {
                                subject: subject,
                                questionType: type,
                                rag: false
                            }
                        })
                    } catch (e) {
                        console.error("Failed to log API usage", e)
                    }

                    // Store in database
                    const { data: doubtRecord, error: dbError } = await supabase
                        .from('doubt_history')
                        .insert({
                            user_id: user.id,
                            question_text: finalQuestion,
                            question_image_url: type === 'image' ? body.imageUrl : null,
                            corrected_question: parsedResponse.correctedQuestion || finalQuestion,
                            detected_subject: parsedResponse.detectedSubject,
                            quick_answer: parsedResponse.quickAnswer,
                            step_by_step_solution: parsedResponse.stepByStepSolution,
                            final_answer: parsedResponse.finalAnswer,
                            related_concepts: parsedResponse.relatedConcepts,
                            practice_question: parsedResponse.practiceQuestion
                        })
                        .select()
                        .single()

                    if (dbError) {
                        console.error('Database error:', dbError)
                    }

                    // Send the final parsed response
                    const finalData = JSON.stringify({
                        type: 'complete',
                        data: {
                            id: doubtRecord?.id,
                            ...parsedResponse,
                            originalQuestion: finalQuestion
                        }
                    })
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
                    controller.close()

                } catch (error) {
                    console.error('Streaming error:', error)
                    const errorData = JSON.stringify({
                        type: 'error',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    })
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
                    controller.close()
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })

    } catch (error) {
        console.error('Doubt assistant error:', error)
        return NextResponse.json(
            {
                error: 'Failed to process question',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
