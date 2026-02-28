import { GoogleGenerativeAI } from "@google/generative-ai"
import { logAPIUsage } from "./api-usage-tracker"

interface GradeDescriptiveParams {
    questionText: string
    correctAnswer: string
    userAnswer: string
    rubric?: {
        keyPoints: string[]
        maxPoints: number
    }
    keywords?: string[]
    userId: string
}

interface GradeCodeParams {
    questionText: string
    userCode: string
    testCases: Array<{
        input: any
        expectedOutput: any
        points: number
    }>
    userId: string
}

interface GradingResult {
    pointsEarned: number
    maxPoints: number
    feedback: string
    isCorrect: boolean
    confidence?: number
}

/**
 * Grade descriptive answers using NLP (Google Gemini API)
 * Tracks API usage for cost estimation
 */
export async function gradeDescriptiveAnswer({
    questionText,
    correctAnswer,
    userAnswer,
    rubric,
    keywords = [],
    userId,
}: GradeDescriptiveParams): Promise<GradingResult> {
    try {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY
        if (!apiKey) {
            throw new Error("GOOGLE_GEMINI_API_KEY not configured")
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const maxPoints = rubric?.maxPoints || 10

        // Construct grading prompt
        const prompt = `You are an expert educational assessment AI. Grade the following student answer.

**Question:** ${questionText}

**Model Answer:** ${correctAnswer}

**Student Answer:** ${userAnswer}

${rubric ? `**Grading Rubric:**
- Key Points to Cover: ${rubric.keyPoints.join(", ")}
- Maximum Points: ${maxPoints}
` : ""}

${keywords.length > 0 ? `**Important Keywords:** ${keywords.join(", ")}` : ""}

**Instructions:**
1. Compare the student's answer with the model answer
2. Check if key concepts are covered
3. Evaluate accuracy, completeness, and understanding
4. Assign points based on the rubric (0-${maxPoints})
5. Provide constructive feedback

**Response Format (JSON):**
{
  "pointsEarned": <number 0-${maxPoints}>,
  "feedback": "<detailed feedback explaining the score>",
  "keyPointsCovered": ["<list of key points the student covered>"],
  "missingPoints": ["<list of what the student missed>"],
  "confidence": <number 0-100, your confidence in this grading>
}

Respond ONLY with valid JSON, no additional text.`

        const startTime = Date.now()
        const result = await model.generateContent(prompt)
        const response = result.response
        const text = response.text()

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error("Failed to parse grading response")
        }

        const gradingData = JSON.parse(jsonMatch[0])

        // Calculate tokens (estimate based on prompt and response length)
        const inputTokens = Math.ceil(prompt.length / 4) // Rough estimate: 1 token ≈ 4 characters
        const outputTokens = Math.ceil(text.length / 4)

        // Log API usage for cost tracking
        await logAPIUsage({
            userId,
            endpoint: "/api/quiz/grade",
            serviceName: "gemini",
            modelName: "gemini-1.5-flash",
            inputTokens,
            outputTokens,
            metadata: {
                questionType: "descriptive",
                pointsEarned: gradingData.pointsEarned,
                maxPoints,
            },
        })

        return {
            pointsEarned: Math.min(gradingData.pointsEarned, maxPoints),
            maxPoints,
            feedback: gradingData.feedback,
            isCorrect: gradingData.pointsEarned >= maxPoints * 0.7, // 70% threshold
            confidence: gradingData.confidence,
        }
    } catch (error) {
        console.error("Error grading descriptive answer:", error)
        // Fallback: simple keyword matching
        return fallbackKeywordGrading(userAnswer, keywords, rubric?.maxPoints || 10)
    }
}

/**
 * Fallback grading using keyword matching
 */
function fallbackKeywordGrading(
    userAnswer: string,
    keywords: string[],
    maxPoints: number
): GradingResult {
    if (keywords.length === 0) {
        return {
            pointsEarned: 0,
            maxPoints,
            feedback: "Unable to grade automatically. Manual review required.",
            isCorrect: false,
        }
    }

    const lowerAnswer = userAnswer.toLowerCase()
    const matchedKeywords = keywords.filter((keyword) =>
        lowerAnswer.includes(keyword.toLowerCase())
    )

    const pointsEarned = Math.round((matchedKeywords.length / keywords.length) * maxPoints)

    return {
        pointsEarned,
        maxPoints,
        feedback: `Matched ${matchedKeywords.length} out of ${keywords.length} key concepts. ${matchedKeywords.length < keywords.length
                ? `Missing: ${keywords.filter((k) => !matchedKeywords.includes(k)).join(", ")}`
                : "Great job covering all key points!"
            }`,
        isCorrect: pointsEarned >= maxPoints * 0.7,
    }
}

/**
 * Grade MCQ answers (simple exact match)
 */
export function gradeMCQAnswer(
    userAnswer: string,
    correctAnswer: string,
    maxPoints: number = 10
): GradingResult {
    const isCorrect = userAnswer.trim() === correctAnswer.trim()

    return {
        pointsEarned: isCorrect ? maxPoints : 0,
        maxPoints,
        feedback: isCorrect
            ? "Correct! Well done."
            : `Incorrect. The correct answer is: ${correctAnswer}`,
        isCorrect,
        confidence: 100,
    }
}

/**
 * Grade code answers (basic validation - full execution would require sandboxing)
 * For now, this is a placeholder. Full implementation would use Docker containers.
 */
export async function gradeCodeAnswer({
    questionText,
    userCode,
    testCases,
    userId,
}: GradeCodeParams): Promise<GradingResult> {
    // This is a simplified version. Production would use:
    // - Docker containers for safe code execution
    // - Judge0 API or similar service
    // - Proper sandboxing and resource limits

    try {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY
        if (!apiKey) {
            throw new Error("GOOGLE_GEMINI_API_KEY not configured")
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const prompt = `You are a code review AI. Analyze the following code submission.

**Question:** ${questionText}

**Student Code:**
\`\`\`
${userCode}
\`\`\`

**Test Cases:**
${testCases.map((tc, i) => `Test ${i + 1}: Input: ${JSON.stringify(tc.input)}, Expected Output: ${JSON.stringify(tc.expectedOutput)}`).join("\n")}

**Instructions:**
1. Analyze if the code would pass the test cases
2. Check for syntax errors
3. Evaluate code quality and efficiency
4. Assign points based on correctness

**Response Format (JSON):**
{
  "pointsEarned": <number 0-${testCases.reduce((sum, tc) => sum + tc.points, 0)}>,
  "feedback": "<detailed feedback>",
  "passedTests": <number of tests that would pass>,
  "totalTests": ${testCases.length},
  "syntaxErrors": ["<list of syntax errors if any>"],
  "suggestions": ["<code improvement suggestions>"]
}

Respond ONLY with valid JSON.`

        const result = await model.generateContent(prompt)
        const response = result.response
        const text = response.text()

        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error("Failed to parse code grading response")
        }

        const gradingData = JSON.parse(jsonMatch[0])

        // Log API usage
        const inputTokens = Math.ceil(prompt.length / 4)
        const outputTokens = Math.ceil(text.length / 4)

        await logAPIUsage({
            userId,
            endpoint: "/api/quiz/grade",
            serviceName: "gemini",
            modelName: "gemini-1.5-flash",
            inputTokens,
            outputTokens,
            metadata: {
                questionType: "code",
                passedTests: gradingData.passedTests,
                totalTests: gradingData.totalTests,
            },
        })

        const maxPoints = testCases.reduce((sum, tc) => sum + tc.points, 0)

        return {
            pointsEarned: Math.min(gradingData.pointsEarned, maxPoints),
            maxPoints,
            feedback: gradingData.feedback,
            isCorrect: gradingData.passedTests === gradingData.totalTests,
            confidence: (gradingData.passedTests / gradingData.totalTests) * 100,
        }
    } catch (error) {
        console.error("Error grading code:", error)
        return {
            pointsEarned: 0,
            maxPoints: testCases.reduce((sum, tc) => sum + tc.points, 0),
            feedback: "Unable to grade code automatically. Manual review required.",
            isCorrect: false,
        }
    }
}
