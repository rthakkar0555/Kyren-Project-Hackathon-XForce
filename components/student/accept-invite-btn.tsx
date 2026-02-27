"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2 } from "lucide-react"
import { acceptClassroomInvite } from "@/app/actions/classroom"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface AcceptInviteBtnProps {
    classroomId: string
    classroomName: string
}

export function AcceptInviteBtn({ classroomId, classroomName }: AcceptInviteBtnProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    const handleAccept = async () => {
        setLoading(true)
        try {
            const result = await acceptClassroomInvite(classroomId)
            if (result.error) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error,
                })
            } else {
                toast({
                    title: "Joined!",
                    description: `You've successfully joined ${classroomName}.`,
                })
                router.refresh()
            }
        } catch {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Something went wrong.",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleAccept}
            disabled={loading}
            className="w-full gap-2"
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <CheckCircle2 className="h-4 w-4" />
            )}
            {loading ? "Accepting..." : "Accept Invite"}
        </Button>
    )
}
