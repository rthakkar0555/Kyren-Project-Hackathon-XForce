"use server"

import { createClient as createGlobalClient } from '@supabase/supabase-js'

export async function fetchReportData(days: number) {
    const supabaseAdmin = createGlobalClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    const dateLimitISO = dateLimit.toISOString();

    // Fetch logs within timeframe. For extreme volume, we should paginate or use RPC,
    // but a few thousand rows is fine to fetch in a server action for a report.
    const { data: logs, error } = await supabaseAdmin
        .from('api_usage_logs')
        .select('*')
        .gte('created_at', dateLimitISO)
        .order('created_at', { ascending: false });

    if (error || !logs) {
        console.error("Failed to fetch logs for report:", error);
        return { error: true, message: "Failed to fetch logs" };
    }

    const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const userEmailMap = new Map(allUsers.map(u => [u.id, u.email]));

    // Aggregates
    let totalCost = 0;
    let totalCalls = logs.length;
    let totalTokens = 0;

    const serviceAggregates = new Map<string, any>();
    const userAggregates = new Map<string, any>();

    logs.forEach(log => {
        const cost = parseFloat(log.estimated_cost_usd?.toString() || "0");
        const tokens = log.total_tokens || 0;

        totalCost += cost;
        totalTokens += tokens;

        // Service map
        const existingService = serviceAggregates.get(log.service_name);
        if (existingService) {
            existingService.calls += 1;
            existingService.tokens += tokens;
            existingService.cost += cost;
        } else {
            serviceAggregates.set(log.service_name, {
                service: log.service_name,
                calls: 1,
                tokens: tokens,
                cost: cost
            });
        }

        // User map
        const existingUser = userAggregates.get(log.user_id);
        if (existingUser) {
            existingUser.calls += 1;
            existingUser.cost += cost;
            existingUser.services.add(log.service_name);
        } else {
            userAggregates.set(log.user_id, {
                userId: log.user_id,
                email: userEmailMap.get(log.user_id) || 'Unknown',
                calls: 1,
                cost: cost,
                services: new Set([log.service_name])
            });
        }
    });

    // Formatting sets back to arrays for JSON serialization
    const servicesReport = Array.from(serviceAggregates.values()).map(s => ({
        ...s, cost: s.cost.toFixed(6)
    })).sort((a, b) => parseFloat(b.cost) - parseFloat(a.cost));

    const usersReport = Array.from(userAggregates.values()).map(u => ({
        email: u.email,
        calls: u.calls,
        cost: u.cost.toFixed(6),
        services: Array.from(u.services as Set<string>).join(', ')
    })).sort((a, b) => parseFloat(b.cost) - parseFloat(a.cost)).slice(0, 50);

    const recentLogs = logs.slice(0, 50).map(log => ({
        time: new Date(log.created_at).toLocaleString(),
        user: userEmailMap.get(log.user_id)?.split('@')[0] || 'Unknown',
        service: log.service_name,
        endpoint: log.endpoint,
        model: log.model_name || '-',
        tokens: log.total_tokens?.toString() || '-',
        cost: parseFloat(log.estimated_cost_usd?.toString() || "0").toFixed(6)
    }));

    return {
        totalCost: totalCost.toFixed(6),
        totalCalls,
        totalTokens,
        avgCost: totalCalls > 0 ? (totalCost / totalCalls).toFixed(6) : "0.000000",
        servicesReport,
        usersReport,
        recentLogs
    };
}
