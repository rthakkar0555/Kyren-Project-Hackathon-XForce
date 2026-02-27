"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { sendConnectionRequest } from "@/app/actions/peer"
import { TutorProfile, User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Github, Linkedin, MessageCircle, Star, Users, Check, Clock } from "lucide-react"

type TutorWithProfile = TutorProfile & {
    fullName: string,
    avatarUrl: string,
    email: string
}

interface TutorExplorerProps {
    tutors: TutorWithProfile[]
    userId: string
    initialPendingTutorIds?: string[]
    userRole?: string
}

export function TutorExplorer({ tutors, userId, initialPendingTutorIds = [], userRole = "student" }: TutorExplorerProps) {
    const [filter, setFilter] = useState("")
    const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set(initialPendingTutorIds))
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
    const { toast } = useToast()

    const handleConnect = async (tutor: TutorWithProfile) => {
        setLoadingIds(prev => new Set(prev).add(tutor.user_id))
        console.log("[Client] Sending request to:", tutor.user_id, "from:", userId)

        try {
            const result = await sendConnectionRequest(tutor.user_id)

            console.log("[Client] Result:", result)

            if (result.error) {
                // If already pending, we should treat it as 'sent' visually
                if (result.error.includes("Request already pending")) {
                    setPendingRequests(prev => new Set(prev).add(tutor.user_id))
                    toast({ title: "Already Sent", description: "You already have a pending request for this tutor." })
                } else if (result.error.includes("Already connected")) {
                    toast({ title: "Connected", description: "You are already connected with this tutor.", className: "bg-blue-600 text-white" })
                } else {
                    toast({ title: "Request Failed", description: result.error, variant: "destructive" })
                }
            } else {
                toast({ title: "Request Sent", description: `Connection request sent to ${tutor.fullName}`, className: "bg-green-600 text-white" })
                setPendingRequests(prev => new Set(prev).add(tutor.user_id))
            }
        } catch (e) {
            console.error("Connect error:", e)
            toast({ title: "Error", description: "Something went wrong. Check console.", variant: "destructive" })
        } finally {
            setLoadingIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(tutor.user_id)
                return newSet
            })
        }
    }

    const filteredTutors = tutors.filter(tutor => {
        if (!filter) return true
        const search = filter.toLowerCase()
        return (
            tutor.fullName?.toLowerCase().includes(search) ||
            tutor.bio?.toLowerCase().includes(search) ||
            tutor.achievements?.toLowerCase().includes(search)
        )
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border shadow-sm">
                <h2 className="text-xl font-bold">Discover Top Tutors</h2>
                <div className="w-1/3">
                    <Input
                        placeholder="Search by name, skill, or achievement..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            {filteredTutors.length > 0 ? (
                <div className="overflow-hidden w-full pb-6 pt-2">
                    <style dangerouslySetInnerHTML={{
                        __html: `
                            @keyframes marquee {
                                0% { transform: translateX(0%); }
                                100% { transform: translateX(-25%); }
                            }
                            .animate-marquee {
                                animation: marquee ${Math.max(filteredTutors.length * 10, 15)}s linear infinite;
                            }
                            .animate-marquee:hover {
                                animation-play-state: paused;
                            }
                        `
                    }} />
                    <div className="flex gap-6 w-max animate-marquee px-2">
                        {[...filteredTutors, ...filteredTutors, ...filteredTutors, ...filteredTutors].map((tutor, idx) => (
                            <div
                                key={`${tutor.id}-${idx}`}
                                className="min-w-[320px] max-w-[320px] shrink-0"
                            >
                                <div className="h-full flex flex-col bg-white border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] p-4 relative group hover:-translate-y-1 transition-transform duration-200">
                                    {/* Avatar & Header */}
                                    <div className="flex flex-col items-center mb-3">
                                        <div className="h-20 w-20 rounded-full bg-pink-100 border-2 border-black flex items-center justify-center text-3xl font-black text-red-500 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-3 overflow-hidden">
                                            {tutor.avatarUrl ? (
                                                <img
                                                    src={tutor.avatarUrl}
                                                    alt={tutor.fullName}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                tutor.fullName?.[0]?.toUpperCase() || "T"
                                            )}
                                        </div>
                                        <h3 className="text-lg font-black text-black text-center leading-tight mb-1">{tutor.fullName}</h3>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">MENTOR</span>

                                        <div className="flex gap-2 w-full justify-center">
                                            <div className={`px-3 py-0.5 border-2 border-black font-bold text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${tutor.current_status === 'available' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                {tutor.current_status}
                                            </div>
                                            <div className="px-2 py-0.5 bg-white border-2 border-black font-bold text-[10px] flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                <Star className="h-3 w-3 fill-yellow-400 text-black" />
                                                {tutor.rating.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bio - Compact */}
                                    <p className="text-center italic text-xs font-medium text-gray-600 mb-4 px-1 min-h-[3em] line-clamp-3">
                                        "{tutor.bio || "Passionate about teaching and guiding peers to success."}"
                                    </p>

                                    {/* Stats Grid - Compact */}
                                    <div className="grid grid-cols-2 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-4 bg-white">
                                        <div className="p-2 flex flex-col items-center justify-center border-r-2 border-black">
                                            <Users className="h-4 w-4 mb-0.5 text-black" />
                                            <span className="text-lg font-black text-black leading-none">{tutor.students_guided_count}</span>
                                            <span className="text-[9px] uppercase font-bold text-gray-500">STUDENTS</span>
                                        </div>
                                        <div className="p-2 flex flex-col items-center justify-center">
                                            <Clock className="h-4 w-4 mb-0.5 text-black" />
                                            <span className="text-lg font-black text-black leading-none">{tutor.hourly_rate ? `$${tutor.hourly_rate}` : "Free"}</span>
                                            <span className="text-[9px] uppercase font-bold text-gray-500">HOURLY</span>
                                        </div>
                                    </div>

                                    {/* Achievements - Compact */}
                                    {tutor.achievements && (
                                        <div className="bg-pink-50 border-2 border-black p-2.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-4 relative mt-1">
                                            <div className="absolute -top-2.5 left-2 bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] uppercase">
                                                Key Achievements
                                            </div>
                                            <p className="text-[10px] font-bold text-black mt-1.5 leading-snug line-clamp-2">
                                                {tutor.achievements}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex-1" />

                                    {/* Socials & Action - Compact */}
                                    <div className="flex flex-col items-center gap-3 mt-auto">
                                        <div className="flex gap-3">
                                            {tutor.linkedin_url && (
                                                <a href={tutor.linkedin_url} target="_blank" rel="noreferrer" className="h-8 w-8 flex items-center justify-center rounded-full bg-white border-2 border-black text-blue-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-none transition-all">
                                                    <Linkedin className="h-4 w-4" />
                                                </a>
                                            )}
                                            {tutor.github_url && (
                                                <a href={tutor.github_url} target="_blank" rel="noreferrer" className="h-8 w-8 flex items-center justify-center rounded-full bg-white border-2 border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-none transition-all">
                                                    <Github className="h-4 w-4" />
                                                </a>
                                            )}
                                        </div>

                                        <Button
                                            className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none rounded-none text-sm uppercase tracking-wide transition-all"
                                            onClick={() => handleConnect(tutor)}
                                            disabled={pendingRequests.has(tutor.user_id) || tutor.user_id === userId || loadingIds.has(tutor.user_id)}
                                        >
                                            {pendingRequests.has(tutor.user_id) ? (
                                                <>
                                                    <Check className="mr-2 h-4 w-4" /> REQUEST SENT
                                                </>
                                            ) : loadingIds.has(tutor.user_id) ? (
                                                <>
                                                    <div className="h-3 w-3 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                    SENDING...
                                                </>
                                            ) : (
                                                "CONNECT NOW"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="w-full text-center py-12 text-muted-foreground border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="font-bold text-gray-500">No tutors found matching your criteria.</p>
                </div>
            )}
        </div>
    )
}
