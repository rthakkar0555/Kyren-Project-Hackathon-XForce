"use client"

// Polyfills for simple-peer
if (typeof window !== 'undefined') {
    if (typeof global === 'undefined') {
        (window as any).global = window
    }
    if (typeof process === 'undefined') {
        (window as any).process = { env: {}, browser: true }
    }
}

import { useEffect, useRef, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, PhoneOff, PenTool, LayoutTemplate } from "lucide-react"
import { useRouter } from "next/navigation"
import SimplePeer from "simple-peer"
import { cn } from "@/lib/utils"
import { CollaborativeWhiteboard } from "./whiteboard"

interface VideoCallProps {
    connectionId: string
    userId: string
    partnerName: string
    recipientId: string
}

export function VideoCall({ connectionId, userId, partnerName, recipientId }: VideoCallProps) {
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
    const [callStatus, setCallStatus] = useState<'initializing' | 'connecting' | 'connected' | 'reconnecting' | 'ended'>('initializing')
    const [error, setError] = useState<string | null>(null)

    // Media state
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)

    // Whiteboard state
    const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false)

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)
    const peerRef = useRef<SimplePeer.Instance | null>(null)
    const connectionRef = useRef<any>(null)
    const isManualEndRef = useRef(false)
    const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Attempt counter
    const [attemptId, setAttemptId] = useState(0)

    const [supabase] = useState(() => createClient())
    const router = useRouter()

    // 1. Get Local Media
    useEffect(() => {
        let mounted = true
        let localMediaStream: MediaStream | null = null

        const initMedia = async () => {
            try {
                localMediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                })
                if (mounted) {
                    setStream(localMediaStream)
                    if (localVideoRef.current) localVideoRef.current.srcObject = localMediaStream
                    if (callStatus === 'initializing') setCallStatus('connecting')
                }
            } catch (err) {
                console.error('[VideoCall] Error accessing media:', err)
                if (mounted) {
                    setError('Could not access camera. Please check permissions.')
                    setCallStatus('ended')
                }
            }
        }
        initMedia()
        return () => {
            mounted = false
            if (localMediaStream) localMediaStream.getTracks().forEach(track => track.stop())
        }
    }, [])

    // 2. Toggle Tracks
    useEffect(() => {
        if (stream) {
            stream.getAudioTracks().forEach(t => t.enabled = !isMuted)
            stream.getVideoTracks().forEach(t => t.enabled = !isVideoOff)
        }
    }, [isMuted, isVideoOff, stream])

    // Update remote video srcObject - Vital to keep this EFFECT based to handle layout changes
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream
            // Ensure play is called, handling browser autoplay policies
            remoteVideoRef.current.play().catch(e => console.error("Error playing remote video:", e))
        }
    }, [remoteStream, isWhiteboardOpen]) // Trigger when layout changes just to be safe

    // 3. Peer Connection
    useEffect(() => {
        if (!stream) return
        if (callStatus === 'ended') return

        let mounted = true

        isManualEndRef.current = false
        const isInitiator = userId < recipientId
        const initPeer = async () => {
            console.log('[VideoCall] Initializing peer connection. Initiator:', isInitiator)
            setCallStatus('connecting')

            let iceServers: any[] = [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]

            try {
                const res = await fetch('/api/turn-credentials')
                if (res.ok) {
                    const data = await res.json()
                    if (data.iceServers && data.iceServers.length > 0) {
                        console.log('[VideoCall] Using TURN servers from API')
                        iceServers = data.iceServers
                    }
                }
            } catch (e) {
                console.warn("[VideoCall] Failed to fetch TURN servers, using fallback STUN", e)
            }

            if (!mounted) return

            // Determine the current call "scope" using the most recent call_invite.
            // This prevents stale WebRTC signals from previous calls on the same connection
            // from corrupting the new handshake (especially on the 2nd / 3rd call).
            let callScopeStartIso: string | null = null
            try {
                const { data: lastInvites } = await supabase
                    .from('chat_messages')
                    .select('created_at')
                    .eq('connection_id', connectionId)
                    .eq('message_type', 'call_invite')
                    .order('created_at', { ascending: false })
                    .limit(1)

                if (lastInvites && lastInvites.length > 0) {
                    callScopeStartIso = lastInvites[0].created_at as string
                }
            } catch (e) {
                console.warn('[VideoCall] Failed to resolve call scope start time', e)
            }

            // Fallback: if we could not find a call_invite (e.g. direct join via URL),
            // only consider signals from the last few minutes.
            const defaultCutoffIso = new Date(Date.now() - 5 * 60 * 1000).toISOString()
            const callScopeCutoffIso = callScopeStartIso ?? defaultCutoffIso
            const callScopeCutoffTs = Date.parse(callScopeCutoffIso)

            const peer = new SimplePeer({
                initiator: isInitiator,
                trickle: true,
                stream: stream,
                config: {
                    iceServers,
                    iceTransportPolicy: 'all' // Ensure we try both relay and host
                }
            })

            peerRef.current = peer

            const processedIds = new Set<string>()

            peer.on('signal', async (data) => {
                if (isManualEndRef.current) return
                // Critical check: Ensure peer is still valid
                if (peer.destroyed) return

                await supabase.from("chat_messages").insert({
                    connection_id: connectionId,
                    sender_id: userId,
                    recipient_id: recipientId,
                    content: JSON.stringify(data),
                    message_type: 'webrtc_signal'
                })
            })

            peer.on('stream', (remoteStream) => {
                setRemoteStream(remoteStream)
                setCallStatus('connected')
                setError(null)
            })

            peer.on('connect', () => {
                setCallStatus('connected')
                setError(null)
            })

            peer.on('close', () => {
                if (!isManualEndRef.current) handleReconnect()
            })

            peer.on('error', (err) => {
                if (!isManualEndRef.current) handleReconnect()
            })

            // Fetch existing signals (handle late joiners) scoped to the current call only
            const fetchSignals = async () => {
                if (!mounted) return

                const { data: signals } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('connection_id', connectionId)
                    .eq('message_type', 'webrtc_signal')
                    .gt('created_at', callScopeCutoffIso)
                    .order('created_at', { ascending: true })
                    .limit(100) // Room for multiple offers/answers/ICE in a single call

                if (!mounted) return

                if (signals) {
                    signals.forEach(msg => {
                        // Only process signals that belong to the active call window
                        if (msg.created_at && callScopeCutoffTs && Date.parse(msg.created_at) < callScopeCutoffTs) return
                        if (msg.sender_id === userId) return
                        if (processedIds.has(msg.id)) return
                        processedIds.add(msg.id)

                        // Critical check: Ensure peer is still valid
                        if (peer.destroyed) return

                        try {
                            const signal = JSON.parse(msg.content)
                            if (signal.type === 'offer' && !isInitiator) peer.signal(signal)
                            else if (signal.type === 'answer' && isInitiator) peer.signal(signal)
                            else if (signal.candidate || (signal.type !== 'offer' && signal.type !== 'answer')) peer.signal(signal)
                        } catch (e) { console.error('Signal error', e) }
                    })
                }
            }

            const channel = supabase.channel(`webrtc:${connectionId}:${attemptId}`)
            channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `connection_id=eq.${connectionId}` }, (payload) => {
                if (isManualEndRef.current) return
                // Critical check: Ensure peer is still valid
                if (peer.destroyed) return

                const msg = payload.new
                // Only react to messages created after our call scope start
                if (msg.created_at && callScopeCutoffTs && Date.parse(msg.created_at) < callScopeCutoffTs) return
                if (msg.sender_id === userId) return
                if (processedIds.has(msg.id)) return
                processedIds.add(msg.id)

                if (msg.message_type === 'call_ended') {
                    endCall(false)
                    return
                }
                if (msg.message_type === 'webrtc_signal') {
                    try {
                        const signal = JSON.parse(msg.content)
                        if (signal.type === 'offer' && !isInitiator) peer.signal(signal)
                        else if (signal.type === 'answer' && isInitiator) peer.signal(signal)
                        else if (signal.candidate || (signal.type !== 'offer' && signal.type !== 'answer')) peer.signal(signal)
                    } catch (e) { console.error('Signal error', e) }
                }
            })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED' && mounted) {
                        fetchSignals()
                    }
                })

            connectionRef.current = channel
        }

        initPeer()

        return () => {
            mounted = false
            if (connectionRef.current) supabase.removeChannel(connectionRef.current)
            if (peerRef.current) {
                peerRef.current.removeAllListeners()
                peerRef.current.destroy()
            }
        }
    }, [stream, attemptId, connectionId, userId, recipientId])

    const handleReconnect = useCallback(() => {
        if (isManualEndRef.current) return
        setCallStatus('reconnecting')
        setRemoteStream(null)
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
        restartTimeoutRef.current = setTimeout(() => {
            setAttemptId(prev => {
                const next = prev + 1
                // After several failed attempts, surface a clear hint that a TURN server is likely required
                if (next > 4) {
                    setError('Connection is repeatedly failing. Configure TURN credentials (see TURN_SERVER_SETUP.md) so calls work across strict networks.')
                }
                return next
            })
        }, 2000)
    }, [])

    const toggleMute = () => setIsMuted(!isMuted)
    const toggleVideo = () => setIsVideoOff(!isVideoOff)

    const endCall = async (notifyPeer = true) => {
        isManualEndRef.current = true
        setCallStatus('ended')
        if (stream) stream.getTracks().forEach(track => { track.stop(); track.enabled = false })
        if (notifyPeer) {
            await supabase.from("chat_messages").insert({
                connection_id: connectionId,
                sender_id: userId,
                recipient_id: recipientId,
                content: "Call ended",
                message_type: 'call_ended'
            })
        }
        if (peerRef.current) peerRef.current.destroy()
        router.push(`/dashboard/peer-learning/${connectionId}`)
    }

    const manualReconnect = () => {
        setCallStatus('reconnecting')
        setAttemptId(prev => prev + 1)
    }

    const toggleWhiteboard = () => setIsWhiteboardOpen(!isWhiteboardOpen)

    return (
        <div className="relative w-full h-full bg-zinc-950 flex overflow-hidden">
            {/* Whiteboard Layer - Left Side / Main when open */}
            <div className={cn(
                "absolute inset-0 z-10 bg-white transition-all duration-500 ease-in-out",
                isWhiteboardOpen
                    ? "right-[300px] opacity-100 pointer-events-auto shadow-2xl" // Sidebar width preserved
                    : "translate-x-[-100%] opacity-0 pointer-events-none"
            )}>
                <CollaborativeWhiteboard
                    connectionId={connectionId}
                    isReadOnly={false}
                    onClose={() => setIsWhiteboardOpen(false)}
                />
            </div>

            {/* Remote Video Container - Transitions between Fullscreen and Sidebar */}
            <div className={cn(
                "transition-all duration-500 ease-in-out overflow-hidden bg-black shadow-2xl border-zinc-800",
                isWhiteboardOpen
                    ? "absolute top-4 right-4 w-[280px] h-[160px] rounded-xl z-20 border-2 shadow-black/50" // Sidebar Mode
                    : "absolute inset-0 w-full h-full z-0 rounded-none border-0" // Fullscreen Mode
            )}>
                {/* Video Element - Persistent */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={cn("w-full h-full object-cover transition-opacity duration-300",
                        (callStatus === 'connected' && remoteStream) ? "opacity-100" : "opacity-0"
                    )}
                />

                {/* Fallback / Status UI */}
                {(!remoteStream || callStatus !== 'connected') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white z-10">
                        <div className={cn("rounded-full flex items-center justify-center bg-zinc-800 font-bold transition-all",
                            isWhiteboardOpen ? "h-12 w-12 text-lg" : "h-32 w-32 text-4xl mb-4"
                        )}>
                            {partnerName?.[0]}
                        </div>
                        {!isWhiteboardOpen && (
                            <div className="text-center animate-pulse">
                                <h3 className="font-bold text-xl">{
                                    callStatus === 'connecting' ? 'Calling...' :
                                        callStatus === 'reconnecting' ? (attemptId > 5 ? 'Connection failing. Check network firewall.' : 'Reconnecting...') :
                                            'Waiting...'
                                }</h3>
                                {callStatus === 'reconnecting' && attemptId > 5 && (
                                    <p className="text-xs text-red-400 mt-2 max-w-[200px]">
                                        Use a different network or configure TURN server.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Local Video Container - Transitions between PIP and Sidebar Stack */}
            <div className={cn(
                "transition-all duration-500 ease-in-out overflow-hidden bg-zinc-800 shadow-2xl ring-1 ring-white/10 group",
                isWhiteboardOpen
                    ? "absolute top-[180px] right-4 w-[280px] h-[160px] rounded-xl z-20" // Stacked under remote
                    : "absolute top-6 right-6 w-64 h-36 rounded-2xl z-50 hover:scale-105" // PIP Mode
            )}>
                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={cn(
                        "w-full h-full object-cover transform scale-x-[-1]",
                        isVideoOff && "hidden"
                    )}
                />
                {isVideoOff && (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <div className="h-12 w-12 bg-zinc-700 rounded-full flex items-center justify-center text-lg font-bold text-zinc-400">
                            You
                        </div>
                    </div>
                )}

                {/* Local Status Indicators */}
                <div className="absolute bottom-2 left-2 flex gap-2">
                    <div className="px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-medium text-white flex items-center gap-1 border border-white/5">
                        {isMuted ? <MicOff className="h-3 w-3 text-red-400" /> : <Mic className="h-3 w-3 text-green-400" />}
                    </div>
                </div>
            </div>

            {/* Sidebar Background (Visual Only) - Appears behind videos when whiteboard open */}
            <div className={cn(
                "absolute top-0 right-0 bottom-0 bg-zinc-950 border-l border-white/10 transition-transform duration-500 z-0",
                isWhiteboardOpen ? "w-[300px] translate-x-0" : "w-[300px] translate-x-full"
            )} />

            {/* Controls - Floating Bottom Center */}
            <div className={cn(
                "absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 hover:scale-105",
                isWhiteboardOpen && "left-[calc(50%-150px)]" // Shift controls left to center under whiteboard
            )}>
                <div className="flex items-center gap-4 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-xl ring-1 ring-white/5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("rounded-full transition-colors", isMuted ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "hover:bg-white/10 text-white")}
                        onClick={toggleMute}
                        title="Toggle Mute"
                    >
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("rounded-full transition-colors", isVideoOff ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "hover:bg-white/10 text-white")}
                        onClick={toggleVideo}
                        title="Toggle Video"
                    >
                        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "rounded-full transition-all duration-300",
                            isWhiteboardOpen
                                ? "bg-indigo-600 text-white ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20"
                                : "hover:bg-white/10 text-white"
                        )}
                        onClick={toggleWhiteboard}
                        title={isWhiteboardOpen ? "Close Whiteboard" : "Open Whiteboard"}
                    >
                        {isWhiteboardOpen ? <LayoutTemplate className="h-5 w-5" /> : <PenTool className="h-5 w-5" />}
                    </Button>

                    <div className="w-px h-6 bg-white/10 mx-1"></div>

                    <Button
                        variant="destructive"
                        size="icon"
                        className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full shadow-lg shadow-red-900/20 ring-1 ring-white/10 hover:ring-white/20"
                        onClick={() => endCall(true)}
                        title="End Call"
                    >
                        <PhoneOff className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
