import { createClient } from "@/lib/supabase/server"
import { getAdminClient } from "@/lib/supabase/server-admin" // Use admin client for public listings
import { TutorExplorer } from "@/components/peer/tutor-explorer"
import { ActiveConnectionCard } from "@/components/peer/active-connection-card"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Check, X, MessageSquare, Video } from "lucide-react"
import { acceptConnectionRequest, rejectConnectionRequest } from "@/app/actions/peer"
import { TutorProfile } from "@/lib/types"

// Helper type for the explorer component
type TutorWithProfile = TutorProfile & {
    fullName: string
    avatarUrl: string
    email: string
}

export default async function PeerLearningPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/auth/login")

    // 1. Get User Role
    const { data: userProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    const role = userProfile?.role || user.user_metadata?.role || "student"

    // 3. Fetch My Connections
    const { data: connections, error: connError } = await supabase
        .from("peer_connections")
        .select(`
        *,
        student:profiles!peer_connections_student_id_fkey(full_name, avatar_url, email),
        tutor:profiles!peer_connections_tutor_id_fkey(full_name, avatar_url, email)
    `)
        .or(`student_id.eq.${user.id},tutor_id.eq.${user.id}`)

    if (connError) {
        console.error("Error fetching connections:", connError)
    }

    console.log(`[Dashboard] User: ${user.id}, Role: ${role}`)
    console.log(`[Dashboard] Raw Connections:`, connections?.length || 0, connections)

    // 3. Fetch All Tutors (for Exploration) - only if student
    let allTutors: TutorWithProfile[] = []
    if (role === 'student') {
        const adminSupabase = getAdminClient() // Bypass RLS for public directory

        const { data: tutors } = await adminSupabase
            .from("tutor_profiles")
            .select("*")

        const tutorList = tutors as TutorProfile[] || []
        const tutorUserIds = tutorList.map(t => t.user_id)

        if (tutorUserIds.length > 0) {
            console.log(`[Dashboard] Found ${tutorUserIds.length} tutor profiles via Admin Client.`)

            const { data: profiles } = await adminSupabase
                .from("profiles")
                .select("id, full_name, avatar_url, email")
                .in("id", tutorUserIds)

            // Also fetch from 'users' table as a fallback since there seems to be duplication/migration
            const { data: legacyUsers } = await adminSupabase
                .from("users")
                .select("id, full_name, email")
                .in("id", tutorUserIds)

            console.log(`[Dashboard] Found ${profiles?.length || 0} matching public profiles.`)
            console.log(`[Dashboard] Found ${legacyUsers?.length || 0} matching users table records.`)

            // Map all tutors, using fallback if profile is missing
            allTutors = tutorList.map(t => {
                const p = profiles?.find(prof => prof.id === t.user_id)
                const u = legacyUsers?.find(user => user.id === t.user_id)

                // Fallback values if profile is missing
                // Priority: Profile Name > User Table Name > Profile Email > User Email > "Unknown Tutor"
                const fullName = p?.full_name || u?.full_name || p?.email?.split('@')[0] || u?.email?.split('@')[0] || "Unknown Tutor"
                const avatarUrl = p?.avatar_url || "" // Only profiles table has avatar_url usually
                const email = p?.email || u?.email || ""

                if (!p && !u) {
                    console.warn(`[Dashboard] Warning: Tutor ${t.id} (User: ${t.user_id}) has no profile OR users record.`)
                } else if (!p) {
                    console.warn(`[Dashboard] Info: Tutor ${t.id} found in users table but missing in profiles.`)
                }

                return {
                    ...t,
                    fullName,
                    avatarUrl,
                    email
                }
            })
        }
    }

    const activeConnections = connections?.filter(c => c.status === 'active') || []
    let pendingConnections = connections?.filter(c => c.status === 'pending') || []

    console.log(`[Dashboard] Pending (Pre-Filter):`, pendingConnections.length)

    // STRICT ROLE FILTERING:
    // If I am a Student, I only want to see requests I SENT (where student_id = me)
    // If I am a Tutor, I only want to see requests intended FOR ME (where tutor_id = me)
    if (role === 'student') {
        pendingConnections = pendingConnections.filter(c => c.student_id === user.id)
    } else if (role === 'tutor') {
        // Fix: Make sure we aren't filtering out valid requests if the ID matches
        pendingConnections = pendingConnections.filter(c => c.tutor_id === user.id)
    }

    console.log(`[Dashboard] Pending (Post-Filter) for ${role}:`, pendingConnections)

    const sentRequestTutorIds = pendingConnections
        .filter(c => c.student_id === user.id)
        .map(c => c.tutor_id)

    // Pre-fetch last messages for active connections to determine call status
    const activeConnectionsWithMsg = await Promise.all(activeConnections.map(async (c) => {
        // Get last call_invite and last call_ended messages
        const { data: lastCallInvite } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("connection_id", c.id)
            .eq("message_type", "call_invite")
            .order("created_at", { ascending: false })
            .limit(1)

        const { data: lastCallEnded } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("connection_id", c.id)
            .eq("message_type", "call_ended")
            .order("created_at", { ascending: false })
            .limit(1)

        const callInviteMsg = lastCallInvite?.[0]
        const callEndedMsg = lastCallEnded?.[0]

        // Show "Join Call" button only if:
        // 1. There's a call_invite message
        // 2. It's incoming (not sent by me)
        // 3. It's recent (within last hour)
        // 4. Either no call_ended message exists, OR call_invite is newer than call_ended
        const isIncomingCall = callInviteMsg?.sender_id !== user.id
        const isRecent = callInviteMsg ? (new Date().getTime() - new Date(callInviteMsg.created_at).getTime()) < 60 * 60 * 1000 : false
        const callStillActive = !callEndedMsg || (callInviteMsg && new Date(callInviteMsg.created_at) > new Date(callEndedMsg.created_at))

        const showJoinCall = callInviteMsg && isIncomingCall && isRecent && callStillActive

        return {
            ...c,
            showJoinCall
        }
    }))

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {role === 'tutor' ? "Peer Learning Dashboard" : "Peer-to-Peer Learning"}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {role === 'student' ? "Find a mentor and level up your skills." : "Manage your students and incoming requests."}
                    </p>
                </div>
                {role === 'tutor' && (
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/dashboard/profile">Manage Tutor Profile</Link>
                        </Button>
                        <Badge variant="outline" className="text-primary border-primary h-10 px-4">Tutor Mode</Badge>
                    </div>
                )}
            </div>

            {/* ACTIVE CONNECTIONS (Chat/Video Access) */}
            {activeConnections.length > 0 && (
                <section>
                    <h2 className="text-xl font-bold mb-4">Active Sessions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeConnectionsWithMsg.map((c: any) => {
                            const partner = role === 'student' ? c.tutor : c.student
                            const partnerName = partner?.full_name || "Partner"
                            const partnerAvatar = partner?.avatar_url

                            return (
                                <ActiveConnectionCard
                                    key={c.id}
                                    connection={c}
                                    userId={user.id}
                                    role={role}
                                    partnerName={partnerName}
                                    partnerAvatar={partnerAvatar}
                                    initialShowJoinCall={c.showJoinCall}
                                />
                            )
                        })}
                    </div>
                </section>
            )}

            {/* PENDING REQUESTS (For Tutor: Accept/Reject. For Student: Sent) */}
            {(role === 'tutor' || pendingConnections.length > 0) && (
                <section>
                    <h2 className="text-xl font-bold mb-4">
                        {role === 'tutor' ? "Incoming Requests" : "Sent Requests"}
                    </h2>

                    {pendingConnections.length === 0 && role === 'tutor' && (
                        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
                            <p className="text-muted-foreground font-medium">No pending requests yet.</p>
                            <p className="text-sm text-muted-foreground mt-1">Students will find your profile and request mentorship.</p>
                            <Button variant="link" asChild className="mt-2 text-primary">
                                <Link href="/dashboard/profile">Improve your profile</Link>
                            </Button>
                        </div>
                    )}

                    <div className="space-y-4">
                        {pendingConnections.map((c: any) => {
                            const partner = role === 'student' ? c.tutor : c.student
                            const isIncoming = role === 'tutor' // Tutors receive requests from students
                            const partnerName = partner?.full_name || "Unknown"
                            const partnerAvatar = partner?.avatar_url

                            return (
                                <div key={c.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-white rounded-md border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-pink-100 flex items-center justify-center font-bold text-pink-600 overflow-hidden relative border-2 border-black shrink-0">
                                            {partnerAvatar ? (
                                                <img
                                                    src={partnerAvatar}
                                                    alt={partnerName}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                partnerName[0]?.toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-black flex items-center gap-2">
                                                {partnerName}
                                                <span className="text-xs font-medium text-gray-500">wants to connect</span>
                                            </p>
                                            <p className="text-xs font-semibold text-gray-500 mt-0.5">Requested {new Date(c.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    {isIncoming ? (
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <form action={async (formData) => {
                                                "use server"
                                                await rejectConnectionRequest(formData)
                                            }} className="w-full sm:w-auto">
                                                <input type="hidden" name="id" value={c.id} />
                                                <Button variant="outline" size="sm" className="w-full bg-white border-2 border-black text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md font-bold transition-all hover:translate-y-0.5 hover:shadow-none">
                                                    <X className="h-4 w-4 mr-1" /> Reject
                                                </Button>
                                            </form>
                                            <form action={async (formData) => {
                                                "use server"
                                                await acceptConnectionRequest(formData)
                                            }} className="w-full sm:w-auto">
                                                <input type="hidden" name="id" value={c.id} />
                                                <Button size="sm" className="w-full bg-[#4F46E5] hover:bg-[#4338ca] text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md font-bold transition-all hover:translate-y-0.5 hover:shadow-none">
                                                    <Check className="h-4 w-4 mr-1" /> Accept
                                                </Button>
                                            </form>
                                        </div>
                                    ) : (
                                        <Badge variant="secondary" className="bg-gray-100 text-black border-2 border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Pending Approval</Badge>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* EXPLORER (Only for Students) */}
            {role === 'student' && (
                <section>
                    <TutorExplorer
                        tutors={allTutors}
                        userId={user.id}
                        initialPendingTutorIds={sentRequestTutorIds}
                        userRole={role}
                    />
                </section>
            )}
        </div>
    )
}
