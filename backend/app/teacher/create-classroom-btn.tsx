"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { createClassroom } from "@/app/actions/classroom"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

export function CreateClassroomBtn() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
    const [section, setSection] = useState("")
    const [description, setDescription] = useState("")
    const { toast } = useToast()
    const router = useRouter()

    const handleCreate = async () => {
        if (!name.trim()) return

        setLoading(true)
        const formData = new FormData()
        formData.append("name", name)
        formData.append("section", section)
        formData.append("description", description)

        try {
            const result = await createClassroom(formData)
            if (result.error) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error,
                })
            } else {
                toast({
                    title: "Success",
                    description: "Classroom created successfully!",
                })
                setOpen(false)
                setName("")
                setSection("")
                setDescription("")
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
                    Create Classroom
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create a new classroom</DialogTitle>
                    <DialogDescription>
                        Use classrooms to assign courses and track student progress.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Class Name (Required)</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Physics 101"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="section">Section</Label>
                        <Input
                            id="section"
                            placeholder="e.g. Period 4, Fall 2024"
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Brief description of the class..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={loading || !name.trim()}>
                        {loading ? "Creating..." : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
