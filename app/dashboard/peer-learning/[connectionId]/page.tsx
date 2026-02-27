import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ChatInterface } from "@/components/peer/chat-interface"
import { VideoCall } from "@/components/peer/video-call"
import { SessionHeader } from "@/components/peer/session-header"

interface PageProps {
    params: Promise<{ connectionId: string }>
    searchParams: Promise<{ video?: string }>
}

export default async function PeerSessionPage({ params, searchParams }: PageProps) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect("/auth/login")

    // Await params and searchParams in Next.js 14+
    const { connectionId } = await params
    const { video } = await searchParams

    const { data: connection } = await supabase
        .from("peer_connections")
        .select(`
        *,
        student:profiles!peer_connections_student_id_fkey(id, full_name, avatar_url),
        tutor:profiles!peer_connections_tutor_id_fkey(id, full_name, avatar_url)
    `)
        .eq("id", connectionId)
        .single()

    if (!connection) notFound()

    // Verify access
    if (connection.student_id !== user.id && connection.tutor_id !== user.id) {
        redirect("/dashboard/peer-to-peer")
    }

    const isVideo = video === 'true'

    // Determine partner
    const isStudent = user.id === connection.student_id
    const partner = isStudent ? connection.tutor : connection.student

    // Fetch chat history (exclude webrtc_signal messages - they're technical, not for display)
    const { data: messages } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("connection_id", connection.id)
        .neq("message_type", "webrtc_signal")
        .order("created_at", { ascending: true })

    return (
        <div className="flex h-screen flex-col bg-background">
            <SessionHeader
                connectionId={connection.id}
                userId={user.id}
                recipientId={partner.id}
                partnerName={partner.full_name || "Partner"}
                partnerAvatar={partner.avatar_url}
                isVideo={isVideo}
            />

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {isVideo ? (
                    <div className="flex-1 bg-black relative flex items-center justify-center">
                        <VideoCall
                            connectionId={connection.id}
                            userId={user.id}
                            partnerName={partner.full_name || "Partner"}
                            recipientId={partner.id}
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col container max-w-4xl mx-auto py-4">
                        <ChatInterface
                            connectionId={connection.id}
                            userId={user.id}
                            recipientId={partner.id}
                            partnerName={partner.full_name || "Partner"}
                            partnerAvatar={partner.avatar_url}
                            initialMessages={messages || []}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

