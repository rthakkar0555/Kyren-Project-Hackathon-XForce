import { createClient } from '@/lib/supabase/server'

// Pricing as of January 2026 (per OpenAI/Google pricing pages)
const PRICING = {
    'gpt-4o-mini': { input: 0.150 / 1_000_000, output: 0.600 / 1_000_000 },
    'gpt-3.5-turbo': { input: 0.500 / 1_000_000, output: 1.500 / 1_000_000 },
    'gpt-4o': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
    'tts-1': { perChar: 0.015 / 1_000 },
    'tts-1-hd': { perChar: 0.030 / 1_000 },
    'gemini-pro': { input: 0.125 / 1_000_000, output: 0.375 / 1_000_000 },
    'gemini-1.5-flash': { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 },
} as const

type ServiceName = 'openai_gpt' | 'openai_tts' | 'gemini' | 'youtube' | 'tesseract' | 'gemini-vision' | 'nvidia_nim'

interface LogAPIUsageParams {
    userId: string
    endpoint: string
    serviceName: ServiceName
    modelName?: string
    inputTokens?: number
    outputTokens?: number
    characterCount?: number // For TTS
    metadata?: Record<string, any>
}

/**
 * Calculate estimated cost based on service and model
 */
function calculateCost(
    serviceName: ServiceName,
    modelName: string | undefined,
    inputTokens: number,
    outputTokens: number,
    characterCount?: number
): number {
    if (serviceName === 'tesseract' || serviceName === 'youtube') {
        return 0 // Free services
    }

    if (serviceName === 'openai_tts' && characterCount) {
        const model = modelName || 'tts-1'
        const pricing = PRICING[model as keyof typeof PRICING] as { perChar: number } | undefined
        if (pricing && 'perChar' in pricing) {
            return characterCount * pricing.perChar
        }
        return 0
    }

    if (serviceName === 'openai_gpt' || serviceName === 'gemini') {
        const model = modelName || 'gpt-4o-mini'
        const pricing = PRICING[model as keyof typeof PRICING] as { input: number; output: number } | undefined
        if (pricing && 'input' in pricing && 'output' in pricing) {
            return (inputTokens * pricing.input) + (outputTokens * pricing.output)
        }
    }

    return 0
}

/**
 * Log API usage to database
 */
export async function logAPIUsage({
    userId,
    endpoint,
    serviceName,
    modelName,
    inputTokens = 0,
    outputTokens = 0,
    characterCount,
    metadata = {}
}: LogAPIUsageParams): Promise<void> {
    try {
        const supabase = await createClient()

        const totalTokens = inputTokens + outputTokens
        const estimatedCost = calculateCost(
            serviceName,
            modelName,
            inputTokens,
            outputTokens,
            characterCount
        )

        const { error } = await supabase
            .from('api_usage_logs')
            .insert({
                user_id: userId,
                endpoint,
                service_name: serviceName,
                model_name: modelName,
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                total_tokens: totalTokens,
                estimated_cost_usd: estimatedCost,
                request_metadata: metadata
            })

        if (error) {
            console.error('[API Usage Tracker] Failed to log usage:', error)
        } else {
            console.log(`[API Usage Tracker] Logged ${serviceName} usage: ${totalTokens} tokens, $${estimatedCost.toFixed(6)}`)
        }
    } catch (error) {
        console.error('[API Usage Tracker] Error:', error)
    }
}

/**
 * Get usage summary for a user
 */
export async function getUserUsageSummary(userId: string, monthStart?: Date) {
    const supabase = await createClient()

    let query = supabase
        .from('api_billing_summary')
        .select('*')
        .eq('user_id', userId)
        .order('month', { ascending: false })

    if (monthStart) {
        query = query.eq('month', monthStart.toISOString().split('T')[0])
    }

    const { data, error } = await query

    if (error) {
        console.error('[API Usage Tracker] Failed to get summary:', error)
        return []
    }

    return data
}

/**
 * Get recent API calls for a user
 */
export async function getUserRecentCalls(userId: string, limit = 50) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('api_usage_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('[API Usage Tracker] Failed to get recent calls:', error)
        return []
    }

    return data
}
