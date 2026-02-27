import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Cache results for 60 seconds to reduce DB load and timeouts
export const revalidate = 60

export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                },
                global: {
                    fetch: (url, options) => {
                        return fetch(url, {
                            ...options,
                            // @ts-ignore
                            signal: AbortSignal.timeout(2000), // Fail fast after 2 seconds
                        })
                    }
                }
            }
        )

        // Execute queries in parallel
        const [
            { count: coursesCount, error: coursesError },
            { count: lessonsCount, error: lessonsError },
            { count: quizQuestionsCount, error: quizError }
        ] = await Promise.all([
            supabase.from("courses").select("id", { count: "exact", head: true }),
            supabase.from("lessons").select("id", { count: "exact", head: true }),
            supabase.from("quiz_questions").select("id", { count: "exact", head: true })
        ])

        if (coursesError) throw coursesError
        if (lessonsError) throw lessonsError
        if (quizError) throw quizError

        return NextResponse.json(
            {
                courses: coursesCount || 0,
                lessons: lessonsCount || 0,
                quizQuestions: quizQuestionsCount || 0,
            },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
                }
            }
        )
    } catch (error) {
        console.error("Error fetching global stats (returning fallback):", error)
        // Return 0s instead of 500 to keep UI alive
        return NextResponse.json(
            {
                courses: 0,
                lessons: 0,
                quizQuestions: 0,
                error: "Failed to fetch statistics"
            },
            { status: 200 }
        )
    }
}
