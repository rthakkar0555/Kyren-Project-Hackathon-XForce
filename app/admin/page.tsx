import { createClient } from "@/lib/supabase/server"
import { createClient as createGlobalClient } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, BookOpen, Crown, DollarSign, BarChart3, Zap, GraduationCap, Activity, ShieldAlert, BadgeInfo, RefreshCw, TrendingUp } from "lucide-react"
import { ContentMonitor } from "./content-monitor"
import { GrowthAreaChart, ActivityBarChart, UsersDonutChart } from "./admin-charts"

// Force dynamic rendering so admin data is always fresh (never cached)
export const dynamic = 'force-dynamic'
export const revalidate = 0

const PRO_PLAN_PRICE = 29 // USD per month

export default async function AdminDashboard() {
  // 1. Auth Check (Standard Client)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Data Fetching (Service Role Client - Bypasses RLS)
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

  // Fetch all critical data in parallel — including profiles table for subscription truth
  const [
    { count: totalCourses },
    { count: totalLessons },
    { data: recentUsers },
    { data: recentCourses },
    userListResponse,
    { data: allCoursesBase },
    { data: allProfiles },
  ] = await Promise.all([
    supabaseAdmin.from("courses").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("lessons").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("users").select("*").order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("courses").select("*").order("created_at", { ascending: false }).limit(50),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin.from("courses").select("created_at"),
    // THE FIX: Fetch PROFILES table (this is the source of truth for subscriptions)
    supabaseAdmin.from("profiles").select("id, subscription_plan, subscription_status, current_period_end"),
  ])

  // Build a profiles map: user_id → profile data
  const profilesMap = new Map(
    (allProfiles || []).map(p => [p.id, p])
  )

  // Create a map of user_id to auth user data
  const authUsersMap = new Map(
    (userListResponse.data.users || []).map(u => [u.id, {
      email: u.email,
      user_metadata: u.user_metadata
    }])
  )

  // Enrich courses with user email from auth
  const enrichedCourses = (recentCourses || []).map(course => {
    const userData = authUsersMap.get(course.user_id)
    return {
      ...course,
      users: {
        email: userData?.email || 'Unknown',
        raw_user_meta_data: userData?.user_metadata || {}
      }
    }
  })

  const allAuthUsers = userListResponse.data.users || []
  const totalUsers = (userListResponse.data as any).total || allAuthUsers.length

  // FIXED CALCULATION: Use profiles table as source of truth for subscription plans
  // Fall back to user_metadata only if no profile entry exists
  let proCount = 0
  let eduCount = 0
  let normalCount = 0

  allAuthUsers.forEach(u => {
    const profile = profilesMap.get(u.id)
    const isEdu = u.email?.endsWith('.edu.in') || u.email?.endsWith('.edu')

    if (isEdu) {
      eduCount++
    } else if (
      // Check profiles table first (most reliable — updated by Stripe webhook)
      profile?.subscription_plan === 'pro' ||
      profile?.subscription_plan === 'enterprise' ||
      // Legacy fallback: check user_metadata
      u.user_metadata?.subscription_plan === 'Pro User' ||
      u.user_metadata?.plan === 'pro_user' ||
      u.user_metadata?.subscription_plan === 'pro'
    ) {
      proCount++
    } else {
      normalCount++
    }
  })

  // Active pro subscriptions (status = active or trialing)
  const activeProCount = (allProfiles || []).filter(
    p => (p.subscription_plan === 'pro' || p.subscription_plan === 'enterprise') &&
      (p.subscription_status === 'active' || p.subscription_status === 'trialing')
  ).length

  // Use active pro count for MRR calculation (only paying active subscribers)
  const estimatedMRR = activeProCount * PRO_PLAN_PRICE

  // --- COMPUTE REAL HISTORICAL DATA FOR CHARTS ---
  const months: any[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      label: d.toLocaleString('en-US', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      newUsers: 0,
      newCourses: 0,
    })
  }

  allAuthUsers.forEach(u => {
    const date = new Date(u.created_at)
    const m = months.find(x => x.month === date.getMonth() && x.year === date.getFullYear())
    if (m) m.newUsers++
  })

  if (allCoursesBase) {
    allCoursesBase.forEach(c => {
      const date = new Date(c.created_at)
      const m = months.find(x => x.month === date.getMonth() && x.year === date.getFullYear())
      if (m) m.newCourses++
    })
  }

  let cumulativeUsers = totalUsers - months.reduce((acc, m) => acc + m.newUsers, 0)
  if (cumulativeUsers < 0) cumulativeUsers = 0

  const historicalData = months.map(m => {
    cumulativeUsers += m.newUsers
    return {
      name: m.label,
      users: cumulativeUsers,
      newUsers: m.newUsers,
      newCourses: m.newCourses,
      mrr: Math.round(cumulativeUsers * (proCount / Math.max(totalUsers, 1)) * PRO_PLAN_PRICE)
    }
  })

  const userBreakdownRaw = [
    { name: "Pro Users", value: proCount, fill: "#6366F1" },
    { name: "Edu Users", value: eduCount, fill: "#8B5CF6" },
    { name: "Free Users", value: normalCount, fill: "#E2E8F0" }
  ]
  const userBreakdown = userBreakdownRaw.filter(item => item.value > 0)
  if (userBreakdown.length === 0) userBreakdown.push({ name: "No Users", value: 1, fill: "#E2E8F0" })

  // Pro conversion rate
  const proConversionRate = totalUsers > 0 ? ((proCount / totalUsers) * 100).toFixed(1) : "0.0"
  const eduAdoptionRate = totalUsers > 0 ? ((eduCount / totalUsers) * 100).toFixed(1) : "0.0"

  const lastRefreshed = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b-2 border-black bg-white sticky top-0 z-10 shadow-[0_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="px-8 py-4 flex items-center justify-between max-w-[1600px] mx-auto">
          <div>
            <h1 className="text-3xl font-black text-black">Admin Dashboard</h1>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">System Oversight &amp; Moderation</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-100 border-2 border-gray-200 px-3 py-2 rounded-none">
              <RefreshCw className="h-3 w-3" />
              <span>Live data · {lastRefreshed} IST</span>
            </div>
            <a
              href="/admin"
              className="inline-flex items-center justify-center rounded-none text-sm font-bold border-2 border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 transition-all shadow-[4px_4px_0px_0px_rgba(99,102,241,0.4)] h-10 px-4 py-2"
            >
              ↻ Refresh
            </a>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-none text-sm font-bold border-2 border-black bg-white hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] h-10 px-6 py-2"
            >
              ← Back to App
            </a>
          </div>
        </div>
      </header>

      <main className="p-8 space-y-8 max-w-[1600px] mx-auto">

        {/* ROW 0: Key Revenue Metrics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none bg-gradient-to-br from-indigo-600 to-indigo-700 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-200">Total Users</span>
                <div className="p-2 bg-white/10 rounded-sm">
                  <Users className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-4xl font-black text-white">{totalUsers.toLocaleString()}</p>
              <p className="text-xs text-indigo-200 font-bold mt-1">All registered accounts</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-yellow-100">Pro Subscribers</span>
                <div className="p-2 bg-white/10 rounded-sm">
                  <Crown className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-4xl font-black text-white">{proCount.toLocaleString()}</p>
              <p className="text-xs text-yellow-100 font-bold mt-1">{activeProCount} active · {proConversionRate}% conv. rate</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-100">Current MRR</span>
                <div className="p-2 bg-white/10 rounded-sm">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-4xl font-black text-white">${estimatedMRR.toLocaleString()}</p>
              <p className="text-xs text-emerald-100 font-bold mt-1">${PRO_PLAN_PRICE}/user · {activeProCount} active subs</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none bg-gradient-to-br from-purple-600 to-purple-700 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-purple-100">ARR Estimate</span>
                <div className="p-2 bg-white/10 rounded-sm">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-4xl font-black text-white">${(estimatedMRR * 12).toLocaleString()}</p>
              <p className="text-xs text-purple-100 font-bold mt-1">Annualized revenue run rate</p>
            </CardContent>
          </Card>
        </div>

        {/* ROW 1: Large growth chart + stacked key metric cards */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <Card className="xl:col-span-3 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-indigo-50 to-transparent border-b-2 border-black">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-black">Platform Growth</CardTitle>
                <CardDescription className="text-black font-semibold">Cumulative users over last 6 months</CardDescription>
              </div>
              <div className="text-right">
                <h3 className="text-4xl font-black text-emerald-600">${estimatedMRR.toLocaleString()}</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Current MRR</p>
              </div>
            </CardHeader>
            <CardContent className="pt-6 bg-white">
              <div className="h-[300px] w-full">
                <GrowthAreaChart data={historicalData} />
              </div>
            </CardContent>
          </Card>

          <div className="xl:col-span-1 flex flex-col gap-4">
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none flex-1 flex flex-col justify-center bg-white hover:bg-red-50 transition-colors">
              <CardHeader className="py-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-4xl font-black">{totalCourses?.toLocaleString()}</CardTitle>
                  <CardDescription className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mt-2">Total Courses</CardDescription>
                </div>
                <div className="p-3 bg-red-100 border-2 border-black rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <BookOpen className="h-6 w-6 text-red-600" />
                </div>
              </CardHeader>
            </Card>

            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none flex-1 flex flex-col justify-center bg-white hover:bg-blue-50 transition-colors">
              <CardHeader className="py-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-4xl font-black">{totalLessons?.toLocaleString()}</CardTitle>
                  <CardDescription className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mt-2">Lessons Created</CardDescription>
                </div>
                <div className="p-3 bg-blue-100 border-2 border-black rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </CardHeader>
            </Card>

            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none flex-1 flex flex-col justify-center bg-white hover:bg-yellow-50 transition-colors">
              <CardHeader className="py-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-4xl font-black text-yellow-600">{proCount.toLocaleString()}</CardTitle>
                  <CardDescription className="font-bold text-gray-500 uppercase tracking-widest text-[10px] mt-2">Pro Subscribers</CardDescription>
                </div>
                <div className="p-3 bg-yellow-100 border-2 border-black rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Crown className="h-6 w-6 text-yellow-600" />
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* ROW 2: User Breakdown Donut + Monthly Activity Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-4">
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none bg-white">
              <CardHeader className="pb-0 border-b-2 border-black bg-gray-50">
                <CardTitle className="text-lg font-black flex justify-between items-center pb-3">
                  <span>Users Breakdown</span>
                  <Users className="h-5 w-5 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] pt-4 relative">
                <UsersDonutChart data={userBreakdown} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                  <span className="block text-3xl font-black">{totalUsers}</span>
                  <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total</span>
                </div>
              </CardContent>
              {/* Legend */}
              <div className="px-4 pb-4 space-y-2">
                {userBreakdownRaw.filter(x => x.value > 0).map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: item.fill }} />
                      <span className="text-gray-700">{item.name}</span>
                    </div>
                    <span className="font-black">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col justify-center items-center py-5 px-3 bg-white hover:bg-yellow-50 transition-colors">
                <span className="text-2xl font-black text-yellow-600">{proConversionRate}%</span>
                <span className="text-[10px] uppercase font-bold text-black tracking-widest text-center mt-2">Pro Conv.</span>
              </Card>
              <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col justify-center items-center py-5 px-3 bg-white hover:bg-purple-50 transition-colors">
                <span className="text-2xl font-black text-purple-600">{eduAdoptionRate}%</span>
                <span className="text-[10px] uppercase font-bold text-black tracking-widest text-center mt-2">Edu Adpt.</span>
              </Card>
            </div>
          </div>

          <Card className="lg:col-span-3 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none bg-white">
            <CardHeader className="pb-4 flex flex-row items-center justify-between border-b-2 border-black bg-gray-50">
              <div>
                <CardTitle className="text-2xl font-black">Monthly Activity</CardTitle>
                <CardDescription className="font-semibold text-black mt-1">New users &amp; courses by month</CardDescription>
              </div>
              <div className="p-2 border-2 border-black rounded-sm bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <BarChart3 className="h-6 w-6 text-black" />
              </div>
            </CardHeader>
            <CardContent className="pt-6 bg-white">
              <div className="h-[300px] w-full">
                <ActivityBarChart data={historicalData} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ROW 2.5: Admin Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a href="/admin/api-usage" className="block group">
            <Card className="border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none flex items-center justify-between p-6 bg-white hover:bg-blue-50 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-blue-100 border-2 border-black rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform">
                  <Zap className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-black">API Usage Monitor</h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Track LLM costs and tokens</p>
                </div>
              </div>
              <span className="text-black font-black text-xl border-2 border-black px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white group-hover:bg-blue-600 group-hover:text-white transition-colors">View →</span>
            </Card>
          </a>

          <a href="/admin/appeals" className="block group">
            <Card className="border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none flex items-center justify-between p-6 bg-white hover:bg-orange-50 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-orange-100 border-2 border-black rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform">
                  <ShieldAlert className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-black">Ban Appeals</h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Review suspended accounts</p>
                </div>
              </div>
              <span className="text-black font-black text-xl border-2 border-black px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white group-hover:bg-orange-600 group-hover:text-white transition-colors">Manage →</span>
            </Card>
          </a>
        </div>

        {/* ROW 3: Pro Subscribers Table + Recent Joiners */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Pro Subscribers breakdown */}
          <Card className="lg:col-span-1 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col bg-white">
            <CardHeader className="flex-none pb-4 border-b-2 border-black bg-yellow-50">
              <div className="flex items-center gap-3 text-yellow-700">
                <Crown className="h-6 w-6" />
                <CardTitle className="text-xl font-black">Pro Subscribers</CardTitle>
              </div>
              <CardDescription className="text-yellow-900/80 font-bold mt-1">
                {proCount} paid · ${estimatedMRR}/mo revenue
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              <div className="divide-y-2 divide-dashed divide-gray-200">
                {allAuthUsers
                  .filter(u => {
                    const profile = profilesMap.get(u.id)
                    return (
                      profile?.subscription_plan === 'pro' ||
                      profile?.subscription_plan === 'enterprise' ||
                      u.user_metadata?.subscription_plan === 'Pro User' ||
                      u.user_metadata?.plan === 'pro_user' ||
                      u.user_metadata?.subscription_plan === 'pro'
                    )
                  })
                  .slice(0, 15)
                  .map(u => {
                    const profile = profilesMap.get(u.id)
                    const isActive = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
                    return (
                      <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-yellow-50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-black truncate">{u.email}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                            {profile?.current_period_end
                              ? `Renews: ${new Date(profile.current_period_end).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
                              : `Joined: ${new Date(u.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
                            }
                          </p>
                        </div>
                        <span className={`ml-2 flex-shrink-0 text-[9px] px-2 py-1 border-2 font-black tracking-widest uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] ${isActive ? 'bg-green-100 text-green-700 border-green-500' : 'bg-gray-100 text-gray-600 border-gray-400'}`}>
                          {profile?.subscription_status?.toUpperCase() || 'PRO'}
                        </span>
                      </div>
                    )
                  })
                }
                {proCount === 0 && (
                  <div className="p-8 text-center text-gray-400 font-bold text-sm">
                    No pro subscribers yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content Oversight */}
          <Card className="lg:col-span-2 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col h-[550px] bg-white">
            <CardHeader className="flex-none pb-4 border-b-2 border-black bg-red-50">
              <div className="flex items-center gap-3 text-red-700">
                <ShieldAlert className="h-6 w-6" />
                <CardTitle className="text-2xl font-black">Content Oversight</CardTitle>
              </div>
              <CardDescription className="text-red-900/80 font-bold mt-1">
                Monitor recent generations and active AI model usage.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              <ContentMonitor recentCourses={enrichedCourses || []} />
            </CardContent>
          </Card>
        </div>

        {/* ROW 4: Recent Joiners */}
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none bg-white">
          <CardHeader className="pb-4 border-b-2 border-black bg-blue-50">
            <CardTitle className="text-2xl font-black flex items-center justify-between">
              <div className="flex items-center gap-3 text-blue-700">
                <BadgeInfo className="h-6 w-6" />
                <span>Recent Joiners</span>
              </div>
              <span className="text-sm font-bold text-blue-700 bg-blue-100 border-2 border-blue-300 px-3 py-1">
                {totalUsers} total accounts
              </span>
            </CardTitle>
            <CardDescription className="font-bold text-blue-900/80 mt-1">Latest registered accounts with subscription status</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y-2 divide-dashed divide-gray-100">
              {recentUsers?.map((u) => {
                // Find this user's auth data and profile data
                const authUser = authUsersMap.get(u.id)
                const profile = profilesMap.get(u.id)
                const isPro = (
                  profile?.subscription_plan === 'pro' ||
                  profile?.subscription_plan === 'enterprise' ||
                  authUser?.user_metadata?.subscription_plan === 'Pro User' ||
                  authUser?.user_metadata?.plan === 'pro_user' ||
                  authUser?.user_metadata?.subscription_plan === 'pro'
                )
                const isEdu = u.email?.endsWith('.edu.in') || u.email?.endsWith('.edu')
                return (
                  <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 border-2 border-indigo-300 flex items-center justify-center font-black text-indigo-700 text-sm flex-shrink-0">
                        {(u.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-black text-black">{u.email}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          Joined: {new Date(u.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPro && (
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 border-2 border-yellow-500 font-black tracking-widest uppercase shadow-[2px_2px_0px_0px_#eab308]">
                          PRO
                        </span>
                      )}
                      {isEdu && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 border-2 border-purple-400 font-black tracking-widest uppercase shadow-[2px_2px_0px_0px_#a855f7]">
                          EDU
                        </span>
                      )}
                      {!isPro && !isEdu && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 border-2 border-gray-300 font-black tracking-widest uppercase">
                          FREE
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  )
}
