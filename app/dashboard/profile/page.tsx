import { createClient } from "@/lib/supabase/server"
import { extractSkillsFromCourses } from "@/lib/skill-extractor"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
    Trophy,
    Code2,
    Clock,
    BookOpen,
    Star,
    Award,
    Zap,
    GraduationCap
} from "lucide-react"
import { redirect } from "next/navigation"
import { TutorCardManager } from "@/components/profile/tutor-card-manager"

export default async function ProfilePage() {
    const supabase = await createClient()

    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect("/login")
    }

    // 2. Fetch User's Courses
    // Rely on database triggers to have updated 'estimated_hours' precisely
    const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id, title, description, topic, difficulty_level, status, created_at, estimated_hours")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

    if (coursesError) {
        console.error("Error fetching courses:", coursesError)
        return <div>Error loading profile data</div>
    }

    // 3. Fallback: Calculate hours if DB trigger hasn't run yet
    // We need to fetch lessons -> modules -> course connection manually since 'course_id' isn't on lessons
    let extraHours = 0

    // If we suspect data is stale (e.g. some courses have 0 hours), we can try to check specific counts
    // But for performance, we generally trust 'estimated_hours'.
    // We'll trust the DB trigger mainly.

    // 4. Extract Skills & Stats
    const skills = extractSkillsFromCourses(courses || [])

    const totalCourses = courses?.length || 0

    // Sum up the precise hours from database
    const totalHours = courses?.reduce((acc, c) => acc + (c.estimated_hours || 0), 0) || 0

    // Format: "2.5h" or "< 0.1h" or "0h"
    let displayHours = "0h"
    if (totalHours > 0) {
        if (totalHours < 0.1) {
            displayHours = "< 0.1h"
        } else {
            // Show 1 decimal place max (2.5, 3.0 -> 3)
            displayHours = `${Number(totalHours.toFixed(1))}h`
        }
    }

    // 5. Aggregate Certifications
    const certifications = courses?.map(course => ({
        id: course.id,
        title: course.title,
        topic: course.topic,
        date: new Date(course.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }),
        icon: Trophy,
        level: course.difficulty_level
    })) || []

    // 6. PERSISTENCE: Try to save calculated skills to 'user_skills'
    try {
        const skillsToUpsert = skills.map(skill => ({
            user_id: user.id,
            skill_name: skill.name,
            category: skill.category,
            proficiency_level: skill.level,
            source_courses_count: skill.count,
            last_detected_at: new Date().toISOString()
        }))

        // Fire and forget upsert
        if (skillsToUpsert.length > 0) {
            await supabase.from("user_skills").upsert(skillsToUpsert, {
                onConflict: 'user_id, skill_name',
                ignoreDuplicates: false
            })
        }
    } catch (e) {
        console.warn("Could not persist skills:", e)
    }

    // 7. FETCH TUTOR PROFILE
    const { data: userProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    const roleRaw = userProfile?.role || user.user_metadata?.role || "student"
    const role = roleRaw.toLowerCase()
    const displayRole = role.charAt(0).toUpperCase() + role.slice(1)
    const isTutor = role === "tutor"

    let tutorData = null
    if (isTutor) {
        const { data } = await supabase
            .from("tutor_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single()
        tutorData = data
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-b-2 border-border pb-8">
                <div className="flex items-center gap-6">
                    <div className="h-24 w-24 rounded-full border-4 border-primary/20 bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary shrink-0">
                        {user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">
                            {user.user_metadata?.full_name || "Learning Enthusiast"}
                        </h1>
                        <p className="text-muted-foreground mt-2 flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            Member since {new Date(user.created_at).getFullYear()}
                            <Badge className={`ml-2 font-bold text-white shadow-sm border-0 ${role === 'tutor' ? 'bg-[#9333ea] hover:bg-[#7e22ce]' : role === 'teacher' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                                {displayRole}
                            </Badge>
                        </p>
                        {skills.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {skills.slice(0, 3).map(skill => (
                                    <Badge key={skill.name} variant="secondary" className="border border-border">
                                        {skill.name}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="flex gap-8 text-center bg-card p-4 rounded-lg border-2 border-border">
                    <div>
                        <div className="text-3xl font-bold text-primary">{totalCourses}</div>
                        <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Courses</div>
                    </div>
                    <div className="w-px bg-border h-12" />
                    <div>
                        <div className="text-3xl font-bold text-primary">{displayHours}</div>
                        <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Hours</div>
                    </div>
                    <div className="w-px bg-border h-12" />
                    <div>
                        <div className="text-3xl font-bold text-primary">{skills.length}</div>
                        <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Skills</div>
                    </div>
                </div>
            </div>

            {/* TUTOR SECTION */}
            {isTutor && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold tracking-tight mb-4">Your Tutor Card</h2>
                    <div className="max-w-md">
                        <TutorCardManager
                            tutorProfile={tutorData}
                            userId={user.id}
                            fullName={user.user_metadata?.full_name || "Tutor"}
                            avatarUrl={user.user_metadata?.avatar_url || user.user_metadata?.picture}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Skills & Proficiency */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="border-2 border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-yellow-500" />
                                Skill Proficiency
                            </CardTitle>
                            <CardDescription>
                                Skills automatically tracked from your course curriculum
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {skills.length > 0 ? (
                                skills.map((skill) => (
                                    <div key={skill.name} className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold flex items-center gap-2">
                                                {skill.name}
                                                <Badge variant="outline" className="text-[10px] h-5 px-1 py-0 uppercase">
                                                    {skill.category}
                                                </Badge>
                                            </span>
                                            <span className="text-muted-foreground">Level {Math.min(10, Math.ceil(skill.level / 10))}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Progress value={skill.level} className="h-2.5 bg-secondary" />
                                            <span className="text-xs font-mono text-muted-foreground w-8 text-right">{skill.level}%</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
                                    <Code2 className="h-12 w-12 mx-auto opacity-20 mb-3" />
                                    <p className="font-medium">No skills detected yet</p>
                                    <p className="text-sm mt-1 max-w-xs mx-auto">
                                        Create courses like "Introduction to Python" or "Advanced Physics" to build your profile automatically!
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Achievements / Certifications */}
                    <Card className="border-2 border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-primary" />
                                Certifications & Badges
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {certifications.map((cert) => (
                                    <div key={cert.id} className="flex items-start gap-4 p-4 rounded-lg border-2 border-border hover:bg-muted/50 transition-colors group">
                                        <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <cert.icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm leading-tight mb-1">{cert.title}</h4>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                Created {cert.date} • {cert.topic}
                                            </p>
                                            <Badge variant="secondary" className="text-[10px] font-mono">
                                                COURSE AUTHOR
                                            </Badge>
                                        </div>
                                    </div>
                                ))}

                                {certifications.length === 0 && (
                                    <div className="col-span-2 text-center py-8 text-muted-foreground">
                                        <Trophy className="h-12 w-12 mx-auto opacity-20 mb-3" />
                                        <p>Complete courses to earn certifications!</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Key Stats & Info */}
                <div className="space-y-8">
                    <Card className="border-2 border-border bg-gradient-to-br from-primary/5 to-purple-500/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-primary" />
                                Featured Stats
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-background border-2 border-border">
                                    <BookOpen className="h-6 w-6 text-blue-500" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{totalCourses}</div>
                                    <div className="text-xs text-muted-foreground font-bold uppercase">Projects Created</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-background border-2 border-border">
                                    <Clock className="h-6 w-6 text-green-500" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{displayHours}</div>
                                    <div className="text-xs text-muted-foreground font-bold uppercase">Learning Time</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-background border-2 border-border">
                                    <Trophy className="h-6 w-6 text-yellow-500" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">Top {Math.max(1, 100 - (totalCourses * 10))}%</div>
                                    <div className="text-xs text-muted-foreground font-bold uppercase">Global Rank</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
