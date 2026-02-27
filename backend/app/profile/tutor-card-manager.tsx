"use client"

import { useState } from "react"
import { TutorProfile } from "@/lib/types"
import { updateTutorProfile } from "@/app/actions/tutor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Github, Linkedin, Calendar, GraduationCap, Users, Star } from "lucide-react"

interface TutorCardManagerProps {
    tutorProfile: any
    userId: string
    fullName: string
    avatarUrl?: string
}

export function TutorCardManager({ tutorProfile, userId, fullName, avatarUrl }: TutorCardManagerProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        hourly_rate: tutorProfile?.hourly_rate || 10,
        bio: tutorProfile?.bio || "",
        current_status: tutorProfile?.current_status || "available",
        linkedin_url: tutorProfile?.linkedin_url || "",
        github_url: tutorProfile?.github_url || "",
        achievements: tutorProfile?.achievements || ""
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleStatusChange = (value: string) => {
        setFormData(prev => ({ ...prev, current_status: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const data = new FormData()
        // Ensure userId is being sent if the action expects it, though action usually gets it from session
        // If action needs it from form, append it
        data.append("userId", userId)
        Object.entries(formData).forEach(([key, value]) => {
            data.append(key, value.toString())
        })

        await updateTutorProfile(data)
        setIsEditing(false)
    }

    if (!tutorProfile && !isEditing) {
        return (
            <Card className="border-2 border-dashed border-primary/50 bg-primary/5">
                <CardHeader>
                    <CardTitle>Create Your Tutor Card</CardTitle>
                    <CardDescription>Start managing your profile to attract students.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button onClick={() => setIsEditing(true)}>Set Up Profile</Button>
                </CardFooter>
            </Card>
        )
    }

    if (isEditing) {
        return (
            <Card className="border-l-4 border-l-primary shadow-md">
                <CardHeader>
                    <CardTitle>Edit Tutor Profile</CardTitle>
                    <CardDescription>Update your public card details.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                                <Input id="linkedin_url" name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="github_url">GitHub URL</Label>
                                <Input id="github_url" name="github_url" value={formData.github_url} onChange={handleChange} placeholder="https://github.com/..." />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea id="bio" name="bio" value={formData.bio} onChange={handleChange} placeholder="I teach Python and..." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                                <Input
                                    id="hourly_rate"
                                    name="hourly_rate"
                                    type="number"
                                    value={formData.hourly_rate}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="current_status">Status</Label>
                                <Select
                                    value={formData.current_status}
                                    onValueChange={handleStatusChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="available">Available</SelectItem>
                                        <SelectItem value="busy">Busy</SelectItem>
                                        <SelectItem value="offline">Offline</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="achievements">Achievements</Label>
                            <Textarea id="achievements" name="achievements" value={formData.achievements} onChange={handleChange} placeholder="Winner of Hackathon 2024..." />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-l-4 border-l-primary shadow-md bg-card/50 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    Edit Card
                </Button>
            </div>
            <CardHeader className="text-center pb-2">
                <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary border-4 border-background shadow-sm mb-2 overflow-hidden relative">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={fullName}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        fullName?.[0]?.toUpperCase() || "T"
                    )}
                </div>
                <CardTitle className="text-lg">{fullName}</CardTitle>
                <div className="flex justify-center gap-2 mt-2">
                    <Badge variant={formData.current_status === 'available' ? 'default' : 'secondary'}>
                        {formData.current_status}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {tutorProfile?.rating?.toFixed(1) || "5.0"}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 text-sm text-center">
                <p className="text-muted-foreground line-clamp-3 italic px-2">
                    "{formData.bio || "Passionate about teaching and guiding peers."}"
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-medium py-2 border-y border-border/50">
                    <div className="flex flex-col items-center">
                        <Users className="h-4 w-4 mb-1 text-primary" />
                        <span>{tutorProfile?.students_guided_count || 0} Students</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-border/50">
                        <Calendar className="h-4 w-4 mb-1 text-primary" />
                        <span>${formData.hourly_rate}/hr</span>
                    </div>
                </div>

                {formData.achievements && (
                    <div className="bg-muted/30 p-2 rounded text-xs text-left">
                        <span className="font-bold text-primary block mb-1">Achievements:</span>
                        <p className="line-clamp-2">{formData.achievements}</p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="justify-center gap-4 pb-6">
                {formData.linkedin_url && (
                    <a href={formData.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors">
                        <Linkedin className="h-5 w-5" />
                    </a>
                )}
                {formData.github_url && (
                    <a href={formData.github_url} target="_blank" rel="noreferrer" className="text-gray-800 hover:text-black transition-colors">
                        <Github className="h-5 w-5" />
                    </a>
                )}
            </CardFooter>
        </Card>
    )
}
