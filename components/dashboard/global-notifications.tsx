"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { PhoneCall, MessageSquare, PhoneOff, BookOpen } from "lucide-react"
import { ToastAction } from "@/components/ui/toast"

interface GlobalNotificationsProps {
    userId: string
}

export function GlobalNotifications({ userId }: GlobalNotificationsProps) {
    const { toast } = useToast()
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        if (!userId) return

        const channel = supabase
            .channel(`user-notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `recipient_id=eq.${userId}`,
                },
                (payload) => {
                    const newMsg = payload.new

                    // Play sound (optional, browser might block)
                    // const audio = new Audio('/sounds/notification.mp3');
                    // audio.play().catch(e => console.log("Audio play failed", e));

                    if (newMsg.message_type === 'call_invite') {
                        toast({
                            title: "Incoming Video Call 📞",
                            description: "Someone is inviting you to a video call.",
                            duration: 10000,
                            className: "bg-zinc-950 text-white border-zinc-800 shadow-2xl",
                            action: (
                                <ToastAction
                                    altText="Answer"
                                    className="bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/20"
                                    onClick={() => router.push(`/dashboard/peer-learning/${newMsg.connection_id}?video=true`)}
                                >
                                    <PhoneCall className="h-4 w-4 mr-2" /> Answer
                                </ToastAction>
                            ),
                        })
                    } else if (newMsg.message_type === 'call_ended') {
                        toast({
                            title: "Call Ended",
                            description: "The video call has ended.",
                            duration: 5000,
                            className: "bg-zinc-950 text-white border-zinc-800 shadow-2xl",
                            action: (
                                <ToastAction
                                    altText="View Chat"
                                    className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/20"
                                    onClick={() => router.push(`/dashboard/peer-learning/${newMsg.connection_id}`)}
                                >
                                    <MessageSquare className="h-4 w-4 mr-2" /> View Chat
                                </ToastAction>
                            ),
                        })
                    } else if (newMsg.message_type === 'classroom_invite') {
                        toast({
                            title: "Classroom Invite 📚",
                            description: newMsg.content,
                            duration: 8000,
                            className: "bg-zinc-950 text-white border-zinc-800 shadow-2xl",
                            action: (
                                <ToastAction
                                    altText="View"
                                    className="bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/20"
                                    onClick={() => router.push(`/dashboard/classroom`)}
                                >
                                    <BookOpen className="h-4 w-4 mr-2" /> View
                                </ToastAction>
                            ),
                        })
                    } else if (newMsg.message_type === 'text') {
                        // Regular message
                        // Don't toast if we are already on that chat page or looking at notifications
                        if (typeof window !== 'undefined' && !window.location.pathname.includes(newMsg.connection_id)) {
                            toast({
                                title: "New Message",
                                description: newMsg.content.substring(0, 50) + (newMsg.content.length > 50 ? "..." : ""),
                                className: "bg-zinc-950 text-white border-zinc-800 shadow-2xl",
                                action: (
                                    <ToastAction
                                        altText="Read"
                                        className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/20"
                                        onClick={() => router.push(`/dashboard/peer-learning/${newMsg.connection_id}`)}
                                    >
                                        <MessageSquare className="h-4 w-4 mr-2" /> Read
                                    </ToastAction>
                                ),
                            })
                        }
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, supabase, toast, router])

    return null // This component doesn't render anything visible
}

