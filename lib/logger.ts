import { createClient } from "@/lib/supabase/server"

export interface LogEntry {
  userId?: string
  endpoint: string
  modelUsed: string
  tokensUsed?: number
  responseTimeMs: number
  statusCode: number
  errorMessage?: string
}

export async function logAPICall(entry: LogEntry) {
  try {
    const supabase = await createClient()

    await supabase.from("api_logs").insert({
      user_id: entry.userId,
      endpoint: entry.endpoint,
      model_used: entry.modelUsed,
      tokens_used: entry.tokensUsed,
      response_time_ms: entry.responseTimeMs,
      status_code: entry.statusCode,
      error_message: entry.errorMessage,
    })
  } catch (error) {
    console.error("[Logger Error]", error)
  }
}

export async function getUserAPIStats(userId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("api_logs")
      .select("model_used, tokens_used, status_code")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) throw error

    const stats = {
      totalCalls: data?.length || 0,
      totalTokens: data?.reduce((sum: number, log: any) => sum + (log.tokens_used || 0), 0) || 0,
      failedCalls: data?.filter((log: any) => log.status_code >= 400).length || 0,
      modelUsage: {} as Record<string, number>,
    }

    data?.forEach((log: any) => {
      stats.modelUsage[log.model_used] = (stats.modelUsage[log.model_used] || 0) + 1
    })

    return stats
  } catch (error) {
    console.error("[Stats Error]", error)
    return null
  }
}
