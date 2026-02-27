"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Ban, Mail, ShieldAlert, ShieldCheck } from "lucide-react"
import { banUserAndDeleteCourse, sendWarning, unbanUser } from "./actions"
import { toast } from "sonner"

interface Course {
    id: string
    topic: string
    difficulty: string
    created_at: string
    user_id: string
    users: {
        email: string
        raw_user_meta_data?: {
            banned?: boolean
            ban_reason?: string
        }
    }
}

export function ContentMonitor({ recentCourses }: { recentCourses: any[] }) {
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const handleWarn = async (course: Course) => {
        setLoadingId(course.id)
        const res = await sendWarning(course.users?.email || '', course.topic)
        setLoadingId(null)

        if (res.success) {
            toast.success(res.message)
        } else {
            toast.error(res.message)
        }
    }

    const handleBan = async (course: Course) => {
        if (!confirm(`Are you sure you want to BAN ${course.users?.email} and DELETE this course? This cannot be undone.`)) return

        setLoadingId(course.id)
        const res = await banUserAndDeleteCourse(course.user_id, course.id, "Violation of content policy")
        setLoadingId(null)

        if (res.success) {
            toast.success("User blocked and content purged.")
            window.location.reload()
        } else {
            toast.error(res.message)
        }
    }

    const handleUnban = async (userId: string, userEmail: string) => {
        if (!confirm(`Unban ${userEmail}? They will regain full access to the platform.`)) return

        setLoadingId(userId)
        const res = await unbanUser(userId)
        setLoadingId(null)

        if (res.success) {
            toast.success("User unbanned successfully!")
            window.location.reload()
        } else {
            toast.error(res.message)
        }
    }

    return (
        <Card className="col-span-1 lg:col-span-3 border-2 border-border shadow-sm">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                    <CardTitle>Content Oversight</CardTitle>
                </div>
                <CardDescription>Monitor recent generations. Verify content and take action against policy violations.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-border">
                    <div className="bg-muted/50 p-3 grid grid-cols-12 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <div className="col-span-4">Course Details</div>
                        <div className="col-span-4">Creator</div>
                        <div className="col-span-4 text-right">Actions</div>
                    </div>
                    <div className="divide-y divide-border">
                        {recentCourses?.map((course) => {
                            const isBanned = course.users?.raw_user_meta_data?.banned === true

                            return (
                                <div key={course.id} className="p-4 grid grid-cols-12 items-center gap-4 hover:bg-muted/20 transition-colors">
                                    <div className="col-span-4">
                                        <p className="font-semibold text-sm truncate" title={course.topic}>{course.topic}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="text-[10px] h-5">{course.difficulty}</Badge>
                                            <span className="text-xs text-muted-foreground">{new Date(course.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <div className="col-span-4">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium truncate">{course.users?.email || 'Unknown User'}</p>
                                            {isBanned && (
                                                <Badge variant="destructive" className="text-[9px] h-4 px-1">BANNED</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono truncate">{course.user_id.split('-')[0]}...</p>
                                    </div>
                                    <div className="col-span-4 flex justify-end gap-2">
                                        {isBanned ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs border-green-500/50 text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-600"
                                                onClick={() => handleUnban(course.user_id, course.users?.email)}
                                                disabled={loadingId === course.user_id}
                                            >
                                                <ShieldCheck className="w-3 h-3 mr-1" />
                                                Unban
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs border-amber-500/50 text-amber-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-600"
                                                    onClick={() => handleWarn(course)}
                                                    disabled={loadingId === course.id}
                                                >
                                                    <Mail className="w-3 h-3 mr-1" />
                                                    Warn
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="h-8 text-xs bg-red-600 hover:bg-red-700"
                                                    onClick={() => handleBan(course)}
                                                    disabled={loadingId === course.id}
                                                >
                                                    <Ban className="w-3 h-3 mr-1" />
                                                    Ban & Delete
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {(!recentCourses || recentCourses.length === 0) && (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                No recent activity to verify.
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
