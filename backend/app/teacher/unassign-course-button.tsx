"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, Loader2 } from "lucide-react"
import { unassignCourse } from "@/app/actions/classroom"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface UnassignCourseButtonProps {
    classroomId: string
    courseId: string
    courseTitle: string
}

export function UnassignCourseButton({ classroomId, courseId, courseTitle }: UnassignCourseButtonProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    const handleUnassign = async () => {
        setLoading(true)
        try {
            const result = await unassignCourse(classroomId, courseId)
            if (result.error) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error,
                })
            } else {
                toast({
                    title: "Course Unassigned",
                    description: `"${courseTitle}" has been removed from this classroom.`,
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
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="h-4 w-4" />
                    )}
                    Unassign
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Unassign Course?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will remove <strong>"{courseTitle}"</strong> from this classroom.
                        Students will no longer have access through this classroom.
                        Their existing progress will not be deleted.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleUnassign}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Yes, Unassign
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
