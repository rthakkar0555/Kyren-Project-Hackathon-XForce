"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Video, PhoneOff } from "lucide-react"

interface SessionHeaderProps {
    connectionId: string
    userId: string
    recipientId: string
    partnerName: string
    partnerAvatar?: string
    isVideo: boolean
}

export function SessionHeader({
    connectionId,
    userId,
    recipientId,
    partnerName,
    partnerAvatar,
    isVideo
}: SessionHeaderProps) {
    const router = useRouter()
    const supabase = createClient()

    const handleStartCall = async (e: React.MouseEvent) => {
        // We allow the default Link behavior to happen (navigation), 
        // but we ALSO send a message. 
        // Or we can prevent default, send, then push. 
        // Let's do prevent default to ensure message is sent (or at least attempted).
        e.preventDefault()

        // Send 'call_invite' message
        await supabase
            .from("chat_messages")
            .insert({
                connection_id: connectionId,
                sender_id: userId,
                recipient_id: recipientId,
                content: "Started a video call",
                message_type: 'call_invite'
            })

        // Force a hard navigation to ensure clean WebRTC environment (fixes blank screen on client-side nav)
        window.location.href = `/dashboard/peer-learning/${connectionId}?video=true`
    }

    return (
        <header className="sticky top-0 z-50 h-16 border-b px-6 flex items-center justify-between bg-card text-card-foreground shadow-sm">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/peer-to-peer">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-border overflow-hidden relative">
                        {partnerAvatar ? (
                            <img
                                src={partnerAvatar}
                                alt={partnerName}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            partnerName?.[0]?.toUpperCase()
                        )}
                    </div>
                    <div>
                        <h1 className="font-bold leading-none">{partnerName}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                            <span className="text-xs text-muted-foreground">Active Session</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {!isVideo && (
                    <Button onClick={handleStartCall} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-2 border-black/10 shadow-sm">
                        <Video className="h-4 w-4" /> Start Video Call
                    </Button>
                )}
                {isVideo && (
                    <Button asChild variant="destructive" className="gap-2">
                        <Link href={`/dashboard/peer-learning/${connectionId}`}>
                            <PhoneOff className="h-4 w-4" /> End Call
                        </Link>
                    </Button>
                )}
            </div>
        </header>
    )
}
