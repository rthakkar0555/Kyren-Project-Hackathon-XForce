"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { joinClassroom } from "@/app/actions/classroom"
import { useToast } from "@/components/ui/use-toast"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export function JoinClassroomBtn() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [code, setCode] = useState("")
    const { toast } = useToast()
    const router = useRouter()

    const handleJoin = async () => {
        if (!code.trim()) return

        setLoading(true)
        try {
            const result = await joinClassroom(code)
            if (result.error) {
                toast({
                    variant: "destructive",
                    title: "Join Failed",
                    description: result.error,
                })
            } else {
                toast({
                    title: "Success",
                    description: "You have joined the classroom!",
                })
                setOpen(false)
                setCode("")
                router.refresh()
            }
        } catch (error) {
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Join Classroom
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Join a Classroom</DialogTitle>
                    <DialogDescription>
                        Enter the 6-character code provided by your teacher.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="code">Class Code</Label>
                        <Input
                            id="code"
                            placeholder="e.g. A1B2C3"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            className="text-center font-mono text-lg tracking-widest uppercase"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleJoin} disabled={loading || code.length < 6}>
                        {loading ? "Joining..." : "Join"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
