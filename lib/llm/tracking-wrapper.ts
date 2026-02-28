import { logAPIUsage } from "@/lib/api-usage-tracker"
import { generateText } from "ai"

/**
 * Wrapper around generateText that automatically logs API usage
 */
export async function generateTextWithTracking(
    params: Parameters<typeof generateText>[0],
    userId: string,
    provider: "openai" | "gemini",
    endpoint: string = "/api/courses/generate"
) {
    const response = await generateText(params)

    const { usage } = response

    // Log API usage
    if (usage) {
        try {
            await logAPIUsage({
                userId,
                service: provider === "openai" ? "OpenAI GPT" : "Google Gemini",
                endpoint,
                model: provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash",
                promptTokens: usage.promptTokens || 0,
                completionTokens: usage.completionTokens || 0,
                totalTokens: (usage.promptTokens || 0) + (usage.completionTokens || 0),
            })
            console.log(`[Tracking] Logged ${usage.totalTokens} tokens for ${endpoint}`)
        } catch (error) {
            console.error("[Tracking] Failed to log API usage:", error)
        }
    }

    return response
}
