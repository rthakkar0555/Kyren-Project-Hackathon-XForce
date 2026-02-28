/**
 * Doubt Response Formatter
 * Formats AI responses into structured educational answers
 */

export interface DoubtResponse {
    detectedSubject: string
    correctedQuestion: string
    quickAnswer: string
    stepByStepSolution: string
    finalAnswer: string
    relatedConcepts: string[]
    practiceQuestion: string
}

/**
 * Parse AI response into structured format
 */
export function parseDoubtResponse(rawResponse: string): DoubtResponse {
    const lines = rawResponse.split('\n')

    let detectedSubject = 'General Science'
    let correctedQuestion = ''
    let quickAnswer = ''
    let stepByStepSolution = ''
    let finalAnswer = ''
    let relatedConcepts: string[] = []
    let practiceQuestion = ''

    let currentSection = ''

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        // Detect sections
        if (line.includes('[Detected Subject]')) {
            currentSection = 'subject'
            continue
        } else if (line.includes('[Corrected Question]')) {
            currentSection = 'corrected'
            continue
        } else if (line.includes('[Quick Answer]')) {
            currentSection = 'quick'
            continue
        } else if (line.includes('[Step-by-Step Solution]')) {
            currentSection = 'steps'
            continue
        } else if (line.includes('[Final Answer]')) {
            currentSection = 'final'
            continue
        } else if (line.includes('[Related Concepts]')) {
            currentSection = 'concepts'
            continue
        } else if (line.includes('[Try This Next]')) {
            currentSection = 'practice'
            continue
        }

        // Skip empty lines and section markers
        if (!line || line.startsWith('[') || line.startsWith('---')) {
            continue
        }

        // Populate sections
        switch (currentSection) {
            case 'subject':
                detectedSubject = line.replace(/^[:\-\s]+/, '')
                break
            case 'corrected':
                correctedQuestion += line + '\n'
                break
            case 'quick':
                quickAnswer += line + '\n'
                break
            case 'steps':
                stepByStepSolution += line + '\n'
                break
            case 'final':
                finalAnswer += line + '\n'
                break
            case 'concepts':
                if (line.startsWith('-') || line.startsWith('•')) {
                    relatedConcepts.push(line.replace(/^[\-•\s]+/, ''))
                }
                break
            case 'practice':
                practiceQuestion += line + '\n'
                break
        }
    }

    // Fallback if parsing failed to extract meaningful content
    // This prevents the "answer disappearing" issue when LLM doesn't follow strict format
    if (!quickAnswer && !stepByStepSolution) {
        return {
            detectedSubject: detectedSubject,
            correctedQuestion: '',
            quickAnswer: 'Here is the solution:',
            stepByStepSolution: rawResponse,
            finalAnswer: '',
            relatedConcepts: [],
            practiceQuestion: ''
        }
    }

    return {
        detectedSubject: detectedSubject.trim(),
        correctedQuestion: correctedQuestion.trim(),
        quickAnswer: quickAnswer.trim(),
        stepByStepSolution: stepByStepSolution.trim(),
        finalAnswer: finalAnswer.trim(),
        relatedConcepts: relatedConcepts.filter(c => c.length > 0),
        practiceQuestion: practiceQuestion.trim()
    }
}

/**
 * Validate that response has minimal required sections
 */
export function validateResponse(response: DoubtResponse): boolean {
    // Relaxed validation: content is valid if it has EITHER quickAnswer OR stepByStepSolution
    return !!(
        (response.quickAnswer || response.stepByStepSolution)
    )
}

/**
 * Generate fallback response if AI response is invalid
 */
export function generateFallbackResponse(question: string, subject: string): DoubtResponse {
    return {
        detectedSubject: subject,
        correctedQuestion: question,
        quickAnswer: 'I apologize, but I need more context to answer this question accurately.',
        stepByStepSolution: '1. Please rephrase your question with more details\n2. Include any relevant information or context\n3. Specify what you need help understanding',
        finalAnswer: 'Please provide more details so I can help you better.',
        relatedConcepts: ['Question Clarity', 'Problem Context', 'Information Gathering'],
        practiceQuestion: 'Try asking: "Can you explain [specific concept] in [subject]?"'
    }
}

/**
 * Clean and normalize text from OCR
 */
export function normalizeOCRText(text: string): string {
    return text
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Fix common OCR errors
        .replace(/\b0\b/g, 'O') // Zero to O in words
        .replace(/\bl\b/g, 'I') // lowercase L to I
        .replace(/\|/g, 'I') // pipe to I
        // Clean up
        .trim()
}

/**
 * Format step-by-step solution to ensure proper line breaks
 * Each step should be on a new line with spacing
 */
export function formatStepByStepSolution(solution: string): string {
    // Replace patterns where steps run together
    let formatted = solution
        // Add newlines before "Step N:" patterns
        .replace(/(\S)\s+(Step \d+:)/g, '$1\n\n$2')
        // Add newlines before "**Step N:" patterns
        .replace(/(\S)\s+(\*\*Step \d+:)/g, '$1\n\n$2')
        // Add newlines after bold step headers that don't have them
        .replace(/(\*\*Step \d+:[^*]+\*\*)(\S)/g, '$1\n$2')
        // Add newlines after plain "Step N: Title" headers before the explanation
        // Example: "Step 1: Recognize the integral Identify the integral..." =>
        //          "Step 1: Recognize the integral\n\nIdentify the integral..."
        .replace(/(Step \d+:[^\n]+?)(\s+)(?=[A-Z(\\[])/g, '$1\n\n')
        // Ensure blank line after each step's explanation before next step
        .replace(/([.!?])\s*(\*\*Step \d+:)/g, '$1\n\n$2')
        // Handle case patterns
        .replace(/(\S)\s+(Case \d+:)/gi, '$1\n\n$2')
        .replace(/(\S)\s+(\*\*Case \d+:)/gi, '$1\n\n$2')
        // Clean up excessive newlines (max 2 consecutive)
        .replace(/\n{3,}/g, '\n\n')
        .trim()

    return formatted
}
