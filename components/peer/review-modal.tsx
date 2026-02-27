"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface ReviewModalProps {
    tutorId: string
    tutorName: string
    connectionId: string // Used to optionally mark connection as 'ended'
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export function ReviewModal({ tutorId, tutorName, connectionId, isOpen, onOpenChange }: ReviewModalProps) {
    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()
    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async () => {
        if (rating === 0) {
            toast({ title: "Rating Required", description: "Please select a star rating.", variant: "destructive" })
            return
        }

        setIsSubmitting(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) throw new Error("Not authenticated")

            // 1. Submit Review
            const { error: reviewError } = await supabase
                .from("tutor_reviews")
                .insert({
                    tutor_id: tutorId,
                    student_id: user.id,
                    rating,
                    comment
                })

            if (reviewError) throw reviewError

            // 2. Mark Connection as 'Ended' (Completed)
            // This signifies "Mentorship Done"
            const { error: connectionError } = await supabase
                .from("peer_connections")
                .update({ status: 'ended' })
                .eq("id", connectionId)

            if (connectionError) console.warn("Could not update connection status:", connectionError)

            toast({
                title: "Feedback Submitted!",
                description: `Your rating for ${tutorName} has been recorded.`,
                className: "bg-green-600 text-white"
            })

            onOpenChange(false)
            router.refresh() // Refresh to update "Students Guided" and remove active connection

        } catch (error: any) {
            console.error("Submission error:", error)
            toast({ title: "Error", description: error.message || "Failed to submit feedback", variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Rate Your Experience</DialogTitle>
                    <DialogDescription>
                        How was your mentorship with <span className="font-semibold text-foreground">{tutorName}</span>?
                        Your feedback helps other students find great tutors.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-6">
                    {/* Star Rating */}
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className={`text-3xl transition-all hover:scale-110 focus:outline-none ${rating >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                            >
                                <Star className={rating >= star ? "fill-yellow-400" : ""} />
                            </button>
                        ))}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                        {rating === 0 ? "Tap a star to rate" :
                            rating === 5 ? "Excellent!" :
                                rating === 4 ? "Very Good" :
                                    rating === 3 ? "Good" :
                                        rating === 2 ? "Fair" : "Poor"}
                    </p>

                    {/* Comment Area */}
                    <Textarea
                        placeholder="Share details about your learning experience..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="resize-none min-h-[100px]"
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
                        {isSubmitting ? "Submitting..." : "Submit Review"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
