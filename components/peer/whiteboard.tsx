"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { X, Maximize2, Minimize2 } from "lucide-react"
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
    () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
    { ssr: false }
)

interface WhiteboardProps {
    connectionId: string
    isReadOnly?: boolean
    onClose?: () => void
}

export function CollaborativeWhiteboard({ connectionId, isReadOnly = false, onClose }: WhiteboardProps) {
    const [supabase] = useState(() => createClient())
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isConnected, setIsConnected] = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)
    const excalidrawApiRef = useRef<any>(null)
    const channelRef = useRef<any>(null)

    // Throttling and infinite-loop prevention
    const isRemoteUpdateRef = useRef(false)
    const lastElementsRef = useRef<any>(null)
    const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // ─── Realtime sync (no persistence) ───────────────────────────────────────
    useEffect(() => {
        if (!connectionId) return

        const channel = supabase.channel(`whiteboard:${connectionId}`, {
            config: {
                broadcast: { self: false },
            },
        })
        channelRef.current = channel

        channel.on("broadcast", { event: "excalidraw-scene" }, ({ payload }) => {
            if (!payload?.scene) return
            const api = excalidrawApiRef.current
            if (!api) return
            try {
                isRemoteUpdateRef.current = true
                // Defensively only update elements, ignoring any sent appState to prevent Map serialization crashes
                api.updateScene({ elements: payload.scene.elements })

                // Reset remote update flag after a brief moment to catch subsequent onChanges
                setTimeout(() => {
                    isRemoteUpdateRef.current = false
                }, 50)
            } catch (e) {
                console.error("[Whiteboard] Failed to apply remote scene", e)
                isRemoteUpdateRef.current = false
            }
        })

        channel.subscribe((status) => {
            setIsConnected(status === "SUBSCRIBED")
        })

        return () => {
            setIsConnected(false)
            channelRef.current = null as any
            supabase.removeChannel(channel)
            if (throttleTimeoutRef.current) clearTimeout(throttleTimeoutRef.current)
        }
    }, [connectionId, supabase])

    // ─── Local change handler ─────────────────────────────────────────────────
    const handleChange = useCallback((elements: any, appState: any) => {
        if (isReadOnly || isRemoteUpdateRef.current) return
        const channel: any = channelRef.current
        if (!channel) return

        lastElementsRef.current = elements

        if (!throttleTimeoutRef.current) {
            throttleTimeoutRef.current = setTimeout(() => {
                throttleTimeoutRef.current = null

                const els = lastElementsRef.current
                if (!els) return

                channel
                    .send({
                        type: "broadcast",
                        event: "excalidraw-scene",
                        payload: { scene: { elements: els } }, // Omit appState to avoid serializing Maps like 'collaborators'
                    })
                    .catch((e: any) => {
                        console.error("[Whiteboard] Failed to broadcast scene", e)
                    })
            }, 100) // Throttle to 10 updates per second
        }
    }, [isReadOnly])

    // ─── Fullscreen ───────────────────────────────────────────────────────────
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen()
            setIsFullscreen(true)
        } else {
            document.exitFullscreen()
            setIsFullscreen(false)
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            className="relative flex flex-col w-full h-full border rounded-lg overflow-hidden bg-white"
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b bg-slate-50 z-10">
                <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${isConnected
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                        }`}
                >
                    {isConnected ? "● Live" : "○ Connecting..."}
                </span>

                <div className="flex items-center gap-1">

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                        className="h-8 w-8 hover:bg-slate-100"
                    >
                        {isFullscreen ? (
                            <Minimize2 className="h-4 w-4" />
                        ) : (
                            <Maximize2 className="h-4 w-4" />
                        )}
                    </Button>

                    {onClose && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            title="Close"
                            className="h-8 w-8 hover:bg-slate-100"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Excalidraw Canvas */}
            <div className="flex-1 relative">
                <Excalidraw
                    onChange={handleChange}
                    excalidrawAPI={(api: any) => {
                        excalidrawApiRef.current = api
                    }}
                    viewModeEnabled={isReadOnly}
                />
            </div>
        </div>
    )
}