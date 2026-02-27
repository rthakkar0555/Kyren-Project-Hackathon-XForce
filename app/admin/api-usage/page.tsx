import { createClient as createGlobalClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, DollarSign, Zap, TrendingUp, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { DownloadReportButton } from './download-report'

const SERVICE_COLORS: Record<string, string> = {
    openai_gpt: 'bg-blue-500',
    openai_tts: 'bg-purple-500',
    gemini: 'bg-green-500',
    tesseract: 'bg-orange-500',
    youtube: 'bg-red-500'
}

const SERVICE_NAMES: Record<string, string> = {
    openai_gpt: 'OpenAI GPT',
    openai_tts: 'OpenAI TTS',
    gemini: 'Google Gemini',
    tesseract: 'Tesseract OCR',
    youtube: 'YouTube API'
}

function formatTimeAgo(date: string) {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
}

export default async function AdminAPIUsagePage() {
    // Use Service Role Client to bypass RLS and see ALL users' data
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

    // Get current month for billing summary
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'

    // Fetch ALL API logs (not filtered by user)
    const { data: logs } = await supabaseAdmin
        .from('api_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

    // Fetch ALL billing summaries for current month
    const { data: summaryData } = await supabaseAdmin
        .from('api_billing_summary')
        .select('*')
        .eq('month', currentMonth)
        .order('total_cost_usd', { ascending: false })

    // Get user emails for display
    const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    const userEmailMap = new Map(allUsers.map(u => [u.id, u.email]))

    // Calculate totals DIRECTLY from logs (real-time)
    const totalCost = logs?.reduce((sum, log) => sum + parseFloat(log.estimated_cost_usd.toString()), 0) || 0
    const totalCalls = logs?.length || 0
    const totalTokens = logs?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0

    // Group by service from LOGS (real-time)
    const serviceAggregates = logs?.reduce((acc, log) => {
        const existing = acc.get(log.service_name)
        if (existing) {
            existing.total_calls += 1
            existing.total_tokens += log.total_tokens || 0
            existing.total_cost_usd += parseFloat(log.estimated_cost_usd.toString())
        } else {
            acc.set(log.service_name, {
                service_name: log.service_name,
                total_calls: 1,
                total_tokens: log.total_tokens || 0,
                total_cost_usd: parseFloat(log.estimated_cost_usd.toString())
            })
        }
        return acc
    }, new Map())

    const aggregatedServices = Array.from(serviceAggregates?.values() || [])

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b-2 border-border bg-card">
                <div className="px-8 py-4 flex items-center justify-between max-w-[1600px] mx-auto">
                    <div>
                        <h1 className="text-3xl font-black">API Usage Monitoring</h1>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">Platform-wide API consumption and costs</p>
                    </div>
                    <div className="flex items-center">
                        <Link
                            href="/admin"
                            className="inline-flex items-center gap-2 justify-center rounded-none text-sm font-bold border-2 border-black bg-white hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] h-10 px-6 py-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Admin
                        </Link>
                        <DownloadReportButton />
                    </div>
                </div>
            </header>

            <main className="p-8 space-y-8 max-w-[1600px] mx-auto">
                {/* Stats Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col justify-center bg-white border-t-8 border-t-blue-500">
                        <CardHeader className="py-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-3xl font-black">${totalCost.toFixed(6)}</CardTitle>
                                <CardDescription className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mt-2">Platform-wide API costs</CardDescription>
                            </div>
                            <div className="p-3 bg-blue-100 border-2 border-black rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <DollarSign className="h-6 w-6 text-blue-600" />
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col justify-center bg-white border-t-8 border-t-purple-500">
                        <CardHeader className="py-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-3xl font-black">{totalCalls.toLocaleString()}</CardTitle>
                                <CardDescription className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mt-2">Total API requests</CardDescription>
                            </div>
                            <div className="p-3 bg-purple-100 border-2 border-black rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <Activity className="h-6 w-6 text-purple-600" />
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col justify-center bg-white border-t-8 border-t-green-500">
                        <CardHeader className="py-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-3xl font-black">{totalTokens.toLocaleString()}</CardTitle>
                                <CardDescription className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mt-2">Tokens Consumed</CardDescription>
                            </div>
                            <div className="p-3 bg-green-100 border-2 border-black rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <Zap className="h-6 w-6 text-green-600" />
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col justify-center bg-white border-t-8 border-t-orange-500">
                        <CardHeader className="py-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-3xl font-black">${totalCalls > 0 ? (totalCost / totalCalls).toFixed(6) : '0.000000'}</CardTitle>
                                <CardDescription className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mt-2">Avg Cost/Call</CardDescription>
                            </div>
                            <div className="p-3 bg-orange-100 border-2 border-black rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <TrendingUp className="h-6 w-6 text-orange-600" />
                            </div>
                        </CardHeader>
                    </Card>
                </div>

                <Tabs defaultValue="logs" className="space-y-6">
                    <TabsList className="bg-transparent space-x-4 border-b-2 border-black block rounded-none w-full pb-0 h-auto">
                        <TabsTrigger value="logs" className="rounded-none border-t-2 border-x-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-[4px_-4px_0px_0px_rgba(0,0,0,1)] data-[state=active]:bg-white uppercase font-bold tracking-widest text-xs px-6 py-3">All API Calls</TabsTrigger>
                        <TabsTrigger value="services" className="rounded-none border-t-2 border-x-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-[4px_-4px_0px_0px_rgba(0,0,0,1)] data-[state=active]:bg-white uppercase font-bold tracking-widest text-xs px-6 py-3">By Service</TabsTrigger>
                        <TabsTrigger value="users" className="rounded-none border-t-2 border-x-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-[4px_-4px_0px_0px_rgba(0,0,0,1)] data-[state=active]:bg-white uppercase font-bold tracking-widest text-xs px-6 py-3">By User</TabsTrigger>
                    </TabsList>

                    <TabsContent value="logs" className="space-y-4 pt-4">
                        <Card className="border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none bg-white">
                            <CardHeader className="border-b-2 border-border bg-gray-50/50">
                                <CardTitle className="text-2xl font-black">Recent API Calls (All Users)</CardTitle>
                                <CardDescription className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mt-1">Last 200 API requests across the platform</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="rounded-none border-none">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Time</TableHead>
                                                <TableHead>User</TableHead>
                                                <TableHead>Service</TableHead>
                                                <TableHead>Endpoint</TableHead>
                                                <TableHead>Model</TableHead>
                                                <TableHead className="text-right">Tokens</TableHead>
                                                <TableHead className="text-right">Cost</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!logs || logs.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                        No API calls recorded yet.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                logs.map((log) => (
                                                    <TableRow key={log.id}>
                                                        <TableCell className="font-mono text-xs">
                                                            {formatTimeAgo(log.created_at)}
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            {userEmailMap.get(log.user_id)?.split('@')[0] || 'Unknown'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={SERVICE_COLORS[log.service_name] || 'bg-gray-500'}>
                                                                {SERVICE_NAMES[log.service_name] || log.service_name}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">{log.endpoint}</TableCell>
                                                        <TableCell className="text-xs">{log.model_name || '-'}</TableCell>
                                                        <TableCell className="text-right font-mono text-xs">
                                                            {log.total_tokens > 0 ? log.total_tokens.toLocaleString() : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs">
                                                            ${log.estimated_cost_usd.toFixed(6)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="services" className="space-y-4 pt-4">
                        <Card className="border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none bg-white">
                            <CardHeader className="border-b-2 border-border bg-gray-50/50">
                                <CardTitle className="text-2xl font-black">Usage by Service</CardTitle>
                                <CardDescription className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mt-1">Aggregated usage from recent logs (real-time)</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="rounded-none border-none">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Service</TableHead>
                                                <TableHead className="text-right">Total Calls</TableHead>
                                                <TableHead className="text-right">Total Tokens</TableHead>
                                                <TableHead className="text-right">Total Cost</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {aggregatedServices.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                        No usage data for this month yet.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                aggregatedServices.map((item) => (
                                                    <TableRow key={item.service_name}>
                                                        <TableCell>
                                                            <Badge className={SERVICE_COLORS[item.service_name] || 'bg-gray-500'}>
                                                                {SERVICE_NAMES[item.service_name] || item.service_name}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            {item.total_calls.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            {item.total_tokens > 0 ? item.total_tokens.toLocaleString() : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-semibold">
                                                            ${item.total_cost_usd.toFixed(6)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="users" className="space-y-4 pt-4">
                        <Card className="border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none bg-white">
                            <CardHeader className="border-b-2 border-border bg-gray-50/50">
                                <CardTitle className="text-2xl font-black">Usage by User</CardTitle>
                                <CardDescription className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mt-1">Top users by API consumption (from recent logs)</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="rounded-none border-none">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead>Services Used</TableHead>
                                                <TableHead className="text-right">Total Calls</TableHead>
                                                <TableHead className="text-right">Total Cost</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {!logs || logs.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                        No user data available yet.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                // Group by user from LOGS (real-time data)
                                                Array.from(
                                                    logs.reduce((acc, log) => {
                                                        const existing = acc.get(log.user_id)
                                                        if (existing) {
                                                            existing.services.add(log.service_name)
                                                            existing.total_calls += 1
                                                            existing.total_cost += parseFloat(log.estimated_cost_usd.toString())
                                                        } else {
                                                            acc.set(log.user_id, {
                                                                user_id: log.user_id,
                                                                services: new Set([log.service_name]),
                                                                total_calls: 1,
                                                                total_cost: parseFloat(log.estimated_cost_usd.toString())
                                                            })
                                                        }
                                                        return acc
                                                    }, new Map())
                                                )
                                                    .map(([userId, data]) => ({ userId, ...data }))
                                                    .sort((a, b) => b.total_cost - a.total_cost)
                                                    .slice(0, 50)
                                                    .map((userData) => (
                                                        <TableRow key={userData.userId}>
                                                            <TableCell className="font-medium">
                                                                {userEmailMap.get(userData.userId) || 'Unknown User'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex gap-1 flex-wrap">
                                                                    {Array.from(userData.services).map((service) => (
                                                                        <Badge
                                                                            key={service}
                                                                            variant="outline"
                                                                            className="text-xs"
                                                                        >
                                                                            {SERVICE_NAMES[service] || service}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                {userData.total_calls.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono font-semibold">
                                                                ${userData.total_cost.toFixed(6)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
