import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { gradeDescriptiveAnswer, gradeMCQAnswer, gradeCodeAnswer } from "@/lib/auto-grader"

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const {
            questionId,
            questionType,
            questionText,
            userAnswer,
            correctAnswer,
            rubric,
            keywords,
            testCases,
        } = body

        if (!questionId || !questionType || !userAnswer) {
            return NextResponse.json(
                { error: "Missing required fields: questionId, questionType, userAnswer" },
                { status: 400 }
            )
        }

        let gradingResult

        switch (questionType) {
            case "mcq":
                if (!correctAnswer) {
                    return NextResponse.json({ error: "correctAnswer required for MCQ" }, { status: 400 })
                }
                gradingResult = gradeMCQAnswer(userAnswer, correctAnswer, rubric?.maxPoints || 10)
                break

            case "descriptive":
                if (!correctAnswer || !questionText) {
                    return NextResponse.json(
                        { error: "correctAnswer and questionText required for descriptive questions" },
                        { status: 400 }
                    )
                }
                gradingResult = await gradeDescriptiveAnswer({
                    questionText,
                    correctAnswer,
                    userAnswer,
                    rubric,
                    keywords,
                    userId: user.id,
                })
                break

            case "code":
                if (!testCases || !questionText) {
                    return NextResponse.json(
                        { error: "testCases and questionText required for code questions" },
                        { status: 400 }
                    )
                }
                gradingResult = await gradeCodeAnswer({
                    questionText,
                    userCode: userAnswer,
                    testCases,
                    userId: user.id,
                })
                break

            default:
                return NextResponse.json({ error: "Invalid question type" }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            grading: gradingResult,
        })
    } catch (error) {
        console.error("Error in grading API:", error)
        return NextResponse.json(
            { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        )
    }
}
