"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, Wifi, WifiOff, Phone, X, MessageSquare, BookOpen, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

interface Notification {
    id: string
    connection_id: string
    sender_id: string
    message_type: string
    content: string
    created_at: string
    is_read?: boolean
}

interface NotificationBellProps {
    userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isConnected, setIsConnected] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [showBadgePulse, setShowBadgePulse] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        if (!userId) return

        console.log('[NotificationBell] Initializing for user:', userId)

        // Fetch initial notifications
        const fetchNotifications = async () => {
            console.log('[NotificationBell] Fetching initial notifications...')
            const { data, error } = await supabase
                .from("chat_messages")
                .select("*")
                .eq("recipient_id", userId)
                .in("message_type", ["call_invite", "text", "classroom_invite"])
                .order("created_at", { ascending: false })
                .limit(20)

            if (error) {
                console.error('[NotificationBell] Error fetching notifications:', error)
                return
            }

            if (data) {
                console.log('[NotificationBell] Loaded', data.length, 'notifications')
                setNotifications(data)
                // Count unread (messages from last 1 hour)
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
                const unread = data.filter(
                    (n) => new Date(n.created_at) > oneHourAgo
                ).length
                setUnreadCount(unread)
                console.log('[NotificationBell] Unread count:', unread)
            }
        }

        fetchNotifications()

        // Subscribe to new notifications
        console.log('[NotificationBell] Setting up real-time subscription...')
        const channel = supabase
            .channel(`notifications:${userId}`, {
                config: {
                    broadcast: { self: true },
                },
            })
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `recipient_id=eq.${userId}`,
                },
                (payload) => {
                    console.log('[NotificationBell] Received real-time update:', payload)
                    const newMsg = payload.new as Notification
                    if (["call_invite", "text", "classroom_invite"].includes(newMsg.message_type)) {
                        console.log('[NotificationBell] New notification received!')
                        setNotifications((prev) => {
                            // Deduplicate any repeated messages quickly
                            if (prev.find(n => n.id === newMsg.id)) return prev;
                            return [newMsg, ...prev.slice(0, 19)]
                        })
                        setUnreadCount((prev) => prev + 1)
                        setShowBadgePulse(true)

                        // Play notification sound (optional)
                        try {
                            const audio = new Audio('/notification.mp3')
                            audio.volume = 0.5
                            audio.play().catch(e => console.log('[NotificationBell] Audio play failed:', e))
                        } catch (e) {
                            console.log('[NotificationBell] Audio not available')
                        }

                        // Stop pulse after 5 seconds
                        setTimeout(() => setShowBadgePulse(false), 5000)
                    }
                }
            )
            .subscribe((status) => {
                console.log('[NotificationBell] Subscription status:', status)
                setIsConnected(status === 'SUBSCRIBED')
            })

        // Auto-refresh notifications every 30 seconds
        const refreshInterval = setInterval(() => {
            console.log('[NotificationBell] Auto-refreshing notifications...')
            fetchNotifications()
        }, 30000)

        return () => {
            console.log('[NotificationBell] Cleaning up...')
            clearInterval(refreshInterval)
            supabase.removeChannel(channel)
        }
    }, [userId, supabase])

    const handleNotificationClick = (notification: Notification) => {
        console.log('[NotificationBell] Notification clicked:', notification.id)

        if (notification.message_type === 'call_invite') {
            router.push(`/dashboard/peer-learning/${notification.connection_id}?video=true`)
        } else if (notification.message_type === 'classroom_invite') {
            router.push(`/dashboard/classroom`)
        } else {
            router.push(`/dashboard/peer-learning/${notification.connection_id}`)
        }

        // Mark as read by reducing unread count
        setUnreadCount((prev) => Math.max(0, prev - 1))
        setIsOpen(false)
    }

    const clearAll = async () => {
        console.log('[NotificationBell] Clearing all notifications')
        setNotifications([])
        setUnreadCount(0)

        // Actually permanently delete these notifications across the platform
        await supabase
            .from('chat_messages')
            .delete()
            .eq('recipient_id', userId)
            .in('message_type', ['call_invite', 'text', 'classroom_invite'])
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative group hover:bg-gray-100 transition-all duration-200 rounded-full"
                >
                    <Bell className={`h-5 w-5 text-gray-700 group-hover:text-gray-900 transition-transform ${unreadCount > 0 ? 'animate-swing' : ''} group-hover:scale-110`} />
                    {unreadCount > 0 && (
                        <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 border border-white text-white text-[10px] flex items-center justify-center font-bold shadow-sm ${showBadgePulse ? 'animate-pulse' : ''}`}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                    {/* Connection status indicator */}
                    <span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white transition-all duration-300 ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-80 p-0 border border-gray-200 shadow-xl bg-white rounded-xl overflow-hidden animate-in slide-in-from-top-2 duration-200"
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        {isConnected ? (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full ring-1 ring-green-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                Live
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ring-1 ring-gray-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                                Offline
                            </span>
                        )}
                    </div>
                    {notifications.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAll}
                            className="h-7 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 group"
                        >
                            <Trash2 className="h-3 w-3 mr-1 opacity-50 group-hover:opacity-100 transition-opacity" /> Clear all
                        </Button>
                    )}
                </div>

                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500">
                            <Bell className="h-8 w-8 mb-2 text-gray-300" />
                            <p className="text-sm font-medium text-gray-600">All caught up!</p>
                            <p className="text-xs mt-1 text-gray-400">You have no new notifications.</p>
                        </div>
                    ) : (
                        notifications.map((notification, index) => {
                            const isRecent = new Date(notification.created_at) > new Date(Date.now() - 60 * 60 * 1000)

                            // Determine Icon & Content based on notification type
                            let Icon = MessageSquare;
                            let title = "New Message";
                            let iconStyle = isRecent ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500';

                            if (notification.message_type === 'call_invite') {
                                Icon = Phone;
                                title = "Video Call";
                                iconStyle = isRecent ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500';
                            } else if (notification.message_type === 'classroom_invite') {
                                Icon = BookOpen;
                                title = "Classroom Invite";
                                iconStyle = isRecent ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500';
                            }

                            return (
                                <div key={notification.id} className="border-b border-gray-100 last:border-0 relative">
                                    <DropdownMenuItem
                                        onClick={() => handleNotificationClick(notification)}
                                        className="cursor-pointer p-4 hover:bg-gray-50 transition-colors duration-200 focus:bg-gray-50"
                                    >
                                        <div className="flex items-start gap-3 w-full">
                                            {/* Icon */}
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconStyle} ring-1 ring-black/5`}>
                                                <Icon className="h-4 w-4" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className={`text-sm ${isRecent ? 'font-semibold text-gray-900' : 'font-medium text-gray-500'}`}>
                                                        {title}
                                                    </p>
                                                    {isRecent && (
                                                        <span className="text-[9px] font-bold text-white bg-indigo-500 px-1.5 py-0.5 rounded shadow-sm">
                                                            NEW
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                                    {notification.content}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </DropdownMenuItem>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700 transition-colors" onClick={() => router.push('/dashboard/notifications')}>
                            View all history
                        </Button>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
