"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ChatMessage } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Image as ImageIcon, Video, PhoneCall, PhoneOff, Loader2 } from "lucide-react"
import { parseISO, format } from "date-fns"
import Link from "next/link"

interface ChatInterfaceProps {
    connectionId: string
    userId: string
    recipientId: string
    partnerName: string
    partnerAvatar?: string
    initialMessages: ChatMessage[]
}

export function ChatInterface({
    connectionId,
    userId,
    recipientId,
    partnerName,
    partnerAvatar,
    initialMessages
}: ChatInterfaceProps) {
    // Filter out webrtc_signal messages - they're technical, not for display
    const [messages, setMessages] = useState<ChatMessage[]>(
        initialMessages.filter(msg => msg.message_type !== 'webrtc_signal')
    )
    const [newMessage, setNewMessage] = useState("")
    const [isUploading, setIsUploading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    useEffect(() => {
        // Scroll to bottom on load/update
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    useEffect(() => {
        const channel = supabase
            .channel(`chat:${connectionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `connection_id=eq.${connectionId}`,
                },
                (payload) => {
                    const newMsg = payload.new as ChatMessage
                    // Only add non-webrtc_signal messages to chat display
                    if (newMsg.message_type !== 'webrtc_signal') {
                        setMessages((prev) => [...prev, newMsg])
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [connectionId, supabase])

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        const { error } = await supabase
            .from("chat_messages")
            .insert({
                connection_id: connectionId,
                sender_id: userId,
                recipient_id: recipientId,
                content: newMessage,
                message_type: 'text'
            })

        if (error) {
            console.error("Error sending message:", error)
        } else {
            setNewMessage("")
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.')
            return
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB
            alert('File size must be less than 5MB.')
            return
        }

        setIsUploading(true)
        try {
            // 1. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${connectionId}/${Date.now()}.${fileExt}`

            const { error: uploadError, data } = await supabase.storage
                .from('chat-attachments')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(fileName)

            // 3. Send Message with Image URL
            const { error: msgError } = await supabase
                .from("chat_messages")
                .insert({
                    connection_id: connectionId,
                    sender_id: userId,
                    recipient_id: recipientId,
                    content: publicUrl, // Store URL in content
                    message_type: 'image'
                })

            if (msgError) throw msgError

        } catch (error: any) {
            console.error("Upload failed:", error)
            alert(`Failed to upload image: ${error.message || 'Unknown error'}`)
        } finally {
            setIsUploading(false)
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    return (
        <div className="flex flex-col h-full border rounded-xl bg-background shadow-sm overflow-hidden relative">
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 opacity-50">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                            <Send className="h-8 w-8 text-muted-foreground/50 ml-1" />
                        </div>
                        <p className="text-sm font-medium">Start the conversation with {partnerName}!</p>
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.sender_id === userId
                    const isCallInvite = msg.message_type === 'call_invite'
                    const isCallEnded = msg.message_type === 'call_ended'
                    const isImage = msg.message_type === 'image'
                    const isCallMessage = isCallInvite || isCallEnded

                    return (
                        <div
                            key={msg.id}
                            className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 mb-2 group`}
                        >
                            {!isMe && (
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border border-border overflow-hidden relative shrink-0">
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
                            )}

                            <div
                                className={`
                                    max-w-[75%] rounded-2xl text-sm shadow-sm relative group/message
                                    ${isCallMessage
                                        ? 'w-full max-w-sm !p-0 overflow-hidden bg-background border border-border'
                                        : isImage
                                            ? 'bg-transparent border-0 shadow-none !p-0'
                                            : isMe
                                                ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-br-none px-4 py-2 border-none'
                                                : 'bg-white border border-slate-200 text-foreground rounded-bl-none px-4 py-2'
                                    }
                                `}
                            >
                                {isCallInvite ? (
                                    <div className="flex flex-col">
                                        <div className={`p-4 flex items-center gap-3 ${isMe ? 'bg-blue-700' : 'bg-slate-100'}`}>
                                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                                <Video className={`h-5 w-5 ${isMe ? 'text-white' : 'text-slate-600'}`} />
                                            </div>
                                            <div>
                                                <p className={`font-bold ${isMe ? 'text-white' : 'text-foreground'}`}>Video Call</p>
                                                <p className={`text-xs ${isMe ? 'text-blue-100' : 'text-muted-foreground'}`}>
                                                    {isMe ? 'You started a call' : 'Incoming call invitation...'}
                                                </p>
                                            </div>
                                        </div>
                                        {!isMe && (
                                            <div className="p-2 border-t bg-background">
                                                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 h-9" asChild>
                                                    <Link href={`/dashboard/peer-learning/${connectionId}?video=true`}>
                                                        <PhoneCall className="h-4 w-4" /> Join Call
                                                    </Link>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : isCallEnded ? (
                                    <div className="flex flex-col">
                                        <div className={`p-4 flex items-center gap-3 ${isMe ? 'bg-zinc-700' : 'bg-zinc-100'}`}>
                                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                                <PhoneOff className={`h-5 w-5 ${isMe ? 'text-white' : 'text-zinc-600'}`} />
                                            </div>
                                            <div>
                                                <p className={`font-bold ${isMe ? 'text-white' : 'text-foreground'}`}>Call Ended</p>
                                                <p className={`text-xs ${isMe ? 'text-zinc-100' : 'text-muted-foreground'}`}>
                                                    {isMe ? 'You ended the call' : 'Call has ended'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : isImage ? (
                                    <div className="flex flex-col group/image">
                                        <a href={msg.content} target="_blank" rel="noopener noreferrer">
                                            <img
                                                src={msg.content}
                                                alt="Shared image"
                                                className="rounded-lg max-w-full h-auto max-h-[300px] border border-border/50 shadow-sm object-cover bg-muted hover:opacity-95 transition-opacity cursor-pointer"
                                                loading="lazy"
                                            />
                                        </a>
                                        <div
                                            className={`
                                                text-[10px] mt-1 text-right  opacity-70 px-1
                                                ${isMe ? 'text-white/80' : 'text-muted-foreground'}
                                                ${isMe && 'hidden'} /* Hide timestamp on image for sender if confusing over transparent bg, but let's keep it consistent */
                                            `}
                                            style={{ textShadow: isMe ? '0 1px 2px rgba(0,0,0,0.3)' : 'none' }}
                                        >
                                            {format(parseISO(msg.created_at), 'h:mm a')}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                        <div
                                            className={`
                                                text-[10px] mt-1 text-right  opacity-70
                                                ${isMe ? 'text-white/80' : 'text-muted-foreground'}
                                            `}
                                        >
                                            {format(parseISO(msg.created_at), 'h:mm a')}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                })}
                <div ref={bottomRef} className="h-1" />
            </div>

            <div className="p-4 bg-background border-t">
                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                />

                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                            <ImageIcon className="h-5 w-5" />
                        )}
                    </Button>
                    <div className="flex-1 relative">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={isUploading ? "Uploading image..." : `Message ${partnerName}...`}
                            className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/20 rounded-full px-4 h-10"
                            disabled={isUploading}
                        />
                    </div>
                    <Button
                        type="submit"
                        size="icon"
                        className={`shrink-0 rounded-full transition-all duration-200 ${newMessage.trim() ? 'bg-blue-600 hover:bg-blue-700 scale-100' : 'bg-muted text-muted-foreground scale-90 opacity-50'}`}
                        disabled={!newMessage.trim() || isUploading}
                    >
                        <Send className="h-4 w-4 ml-0.5" />
                    </Button>
                </form>
            </div>
        </div >
    )
}
