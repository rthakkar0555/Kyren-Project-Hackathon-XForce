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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { assignCourseToClassroom } from "@/app/actions/classroom"
import { useToast } from "@/components/ui/use-toast"
import { BookOpen } from "lucide-react"
import { useRouter } from "next/navigation"

interface AssignCourseModalProps {
    classroomId: string
    availableCourses: Array<{ id: string; title: string, topic: string }>
}

export function AssignCourseModal({ classroomId, availableCourses }: AssignCourseModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [selectedCourseId, setSelectedCourseId] = useState("")
    const { toast } = useToast()
    const router = useRouter()

    const handleAssign = async () => {
        if (!selectedCourseId) return

        setLoading(true)
        try {
            const result = await assignCourseToClassroom(classroomId, selectedCourseId)
            if (result.error) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error,
                })
            } else {
                toast({
                    title: "Course Assigned",
                    description: "The course is now available to students.",
                })
                setOpen(false)
                setSelectedCourseId("")
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
                    <BookOpen className="h-4 w-4" />
                    Assign Course
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign a Course</DialogTitle>
                    <DialogDescription>
                        Select a course from your library to publish to this classroom.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a course..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableCourses.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                    No courses available. Create a course first.
                                </div>
                            ) : (
                                availableCourses.map((course) => (
                                    <SelectItem key={course.id} value={course.id}>
                                        {course.title} ({course.topic})
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleAssign} disabled={loading || !selectedCourseId}>
                        {loading ? "Assigning..." : "Assign Course"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
