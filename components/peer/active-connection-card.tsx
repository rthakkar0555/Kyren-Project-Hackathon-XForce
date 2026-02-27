"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { MessageSquare, Video, CheckCircle2, Star } from "lucide-react"
import { ReviewModal } from "./review-modal"

interface ActiveConnectionCardProps {
    connection: any
    userId: string
    role: string
    partnerName: string
    partnerAvatar?: string
    initialShowJoinCall: boolean
}

export function ActiveConnectionCard({
    connection,
    userId,
    role,
    partnerName,
    partnerAvatar,
    initialShowJoinCall
}: ActiveConnectionCardProps) {
    const [showJoinCall, setShowJoinCall] = useState(initialShowJoinCall)
    const [isReviewOpen, setIsReviewOpen] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        // Subscribe to real-time updates for this connection
        const channel = supabase
            .channel(`connection-status:${connection.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `connection_id=eq.${connection.id}`,
                },
                async (payload) => {
                    const newMsg = payload.new
                    if (newMsg.message_type === 'call_invite' && newMsg.sender_id !== userId) {
                        setShowJoinCall(true)
                    } else if (newMsg.message_type === 'call_ended') {
                        setShowJoinCall(false)
                    }
                }
            )
            .subscribe()

        // Sync status on mount
        const checkCallStatus = async () => {
            const { data: lastCallInvite } = await supabase
                .from("chat_messages")
                .select("*")
                .eq("connection_id", connection.id)
                .eq("message_type", "call_invite")
                .order("created_at", { ascending: false })
                .limit(1)

            const { data: lastCallEnded } = await supabase
                .from("chat_messages")
                .select("*")
                .eq("connection_id", connection.id)
                .eq("message_type", "call_ended")
                .order("created_at", { ascending: false })
                .limit(1)

            const callInviteMsg = lastCallInvite?.[0]
            const callEndedMsg = lastCallEnded?.[0]

            const isIncomingCall = callInviteMsg?.sender_id !== userId
            // Valid for 1 hour
            const isRecent = callInviteMsg ? (new Date().getTime() - new Date(callInviteMsg.created_at).getTime()) < 60 * 60 * 1000 : false
            const callStillActive = !callEndedMsg || (callInviteMsg && new Date(callInviteMsg.created_at) > new Date(callEndedMsg.created_at))

            const shouldShow = callInviteMsg && isIncomingCall && isRecent && callStillActive
            setShowJoinCall(shouldShow)
        }

        checkCallStatus()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [connection.id, userId, supabase, initialShowJoinCall])

    return (
        <>
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden">
                <div className="p-5 flex flex-col h-full justify-between gap-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border-2 border-background shadow-sm overflow-hidden relative shrink-0">
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
                            <div className="min-w-0">
                                <h3 className="font-bold text-lg truncate leading-tight">{partnerName}</h3>
                                <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                                    {role === 'student' ? 'Mentor' : 'Student'}
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block"></span>
                                </p>
                            </div>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-green-600 border-green-200 bg-green-50 shadow-sm">
                            Active
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-auto">
                        <Button asChild size="sm" variant={showJoinCall ? "outline" : "default"} className="w-full flex items-center justify-center gap-2 h-9 shadow-sm">
                            <Link href={`/dashboard/peer-learning/${connection.id}`}>
                                <MessageSquare className="h-4 w-4" /> Chat
                            </Link>
                        </Button>

                        {showJoinCall ? (
                            <Button asChild size="sm" className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white animate-pulse shadow-[0_0_15px_rgba(22,163,74,0.5)] border-green-500 h-9">
                                <Link href={`/dashboard/peer-learning/${connection.id}?video=true`}>
                                    <Video className="h-4 w-4 mr-1 animate-bounce" /> Join
                                </Link>
                            </Button>
                        ) : (
                            <Button asChild variant="secondary" size="sm" className="w-full flex items-center justify-center gap-2 h-9">
                                <Link href={`/dashboard/peer-learning/${connection.id}?video=true`}>
                                    <Video className="h-4 w-4" /> Call
                                </Link>
                            </Button>
                        )}
                    </div>

                    {/* Mentorship Completion for Students */}
                    {role === 'student' && (
                        <div className="pt-4 mt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                            <Button
                                size="sm"
                                onClick={() => setIsReviewOpen(true)}
                                className="w-full h-9 text-xs font-bold tracking-wide uppercase bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border-0 rounded-md gap-2"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Mark as Completed & Rate
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            <ReviewModal
                tutorId={connection.tutor_id}
                tutorName={partnerName}
                connectionId={connection.id}
                isOpen={isReviewOpen}
                onOpenChange={setIsReviewOpen}
            />
        </>
    )
}
