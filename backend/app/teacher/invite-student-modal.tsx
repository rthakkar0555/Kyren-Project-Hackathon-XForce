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
import { Textarea } from "@/components/ui/textarea"
import { inviteStudents } from "@/app/actions/classroom"
import { useToast } from "@/components/ui/use-toast"
import { UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"

interface InviteStudentModalProps {
    classroomId: string
}

export function InviteStudentModal({ classroomId }: InviteStudentModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [emails, setEmails] = useState("")
    const { toast } = useToast()
    const router = useRouter()

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            if (!text) return

            // Simple CSV/Text parsing: extract anything looking like an email
            // This regex matches email patterns globally in the text
            const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g
            const foundEmails = text.match(emailRegex)

            if (foundEmails && foundEmails.length > 0) {
                // Determine if we should append or replace. 
                // Let's append with new line if current emails exist.
                setEmails(prev => {
                    const separator = prev.trim() ? ",\n" : ""
                    // Deduplicate found emails against each other, but not strictly against existing text (user can edit)
                    const uniqueFound = Array.from(new Set(foundEmails))
                    return prev + separator + uniqueFound.join(",\n")
                })
                toast({
                    title: "File Parsed",
                    description: `Found ${foundEmails.length} email addresses.`,
                })
            } else {
                toast({
                    variant: "destructive",
                    title: "No Emails Found",
                    description: "Could not find any valid email addresses in the file.",
                })
            }
        }
        reader.readAsText(file)
    }

    const handleInvite = async () => {
        if (!emails.trim()) return

        setLoading(true)

        // Parse emails (comma, newline, space separated)
        const emailList = emails
            .split(/[\n,; ]+/)
            .map((e) => e.trim())
            .filter((e) => e.length > 3 && e.includes("@"))

        if (emailList.length === 0) {
            toast({
                variant: "destructive",
                title: "Invalid Input",
                description: "Please enter valid email addresses.",
            })
            setLoading(false)
            return
        }

        try {
            const result = await inviteStudents(classroomId, emailList) // Check type compatibility
            if (result.error) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error,
                })
            } else {
                toast({
                    title: "Invites Sent",
                    description: `Successfully invited ${result.count || emailList.length} students.`,
                })
                setOpen(false)
                setEmails("")
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
                    <UserPlus className="h-4 w-4" />
                    Invite Students
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Invite Students</DialogTitle>
                    <DialogDescription>
                        Enter email addresses or upload a CSV/Excel (saved as CSV) file.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Textarea
                            placeholder="student1@example.com, student2@example.com&#10;student3@example.com"
                            value={emails}
                            onChange={(e) => setEmails(e.target.value)}
                            className="min-h-[150px] font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                            Type emails manually or paste a list.
                        </p>
                    </div>

                    <div className="border-t pt-4">
                        <label className="text-sm font-medium mb-2 block">Upload Student List (CSV)</label>
                        <input
                            type="file"
                            accept=".csv,.txt"
                            onChange={handleFileUpload}
                            className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-primary/10 file:text-primary
                                hover:file:bg-primary/20
                            "
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Supports .csv or .txt files containing email addresses.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleInvite} disabled={loading || !emails.trim()}>
                        {loading ? "Sending..." : "Send Invites"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
