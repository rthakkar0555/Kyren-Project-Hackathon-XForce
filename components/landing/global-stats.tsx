"use client"

import { useEffect, useState } from "react"
import { BookOpen, FileText, HelpCircle } from "lucide-react"
import { Card } from "@/components/ui/card"

interface GlobalStats {
    courses: number
    lessons: number
    quizQuestions: number
}

function AnimatedCounter({ value = 0, duration = 2000 }: { value?: number; duration?: number }) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        // Ensure value is a valid number
        const targetValue = typeof value === 'number' && !isNaN(value) ? value : 0

        let startTime: number | null = null
        const startValue = 0
        const endValue = targetValue

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime
            const progress = Math.min((currentTime - startTime) / duration, 1)

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4)
            const currentCount = Math.floor(startValue + (endValue - startValue) * easeOutQuart)

            setCount(currentCount)

            if (progress < 1) {
                requestAnimationFrame(animate)
            } else {
                setCount(endValue)
            }
        }

        requestAnimationFrame(animate)
    }, [value, duration])

    // Ensure count is always a valid number before calling toLocaleString
    const displayValue = typeof count === 'number' && !isNaN(count) ? count : 0
    return <span>{displayValue.toLocaleString()}</span>
}

export default function GlobalStats() {
    const [stats, setStats] = useState<GlobalStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = () => {
            // Fetch stats (Next.js will handle caching based on server config)
            fetch('/api/stats/global')
                .then((res) => res.json())
                .then((data) => {
                    // Validate the response structure
                    if (data && typeof data === 'object' && !data.error) {
                        setStats({
                            courses: typeof data.courses === 'number' ? data.courses : 0,
                            lessons: typeof data.lessons === 'number' ? data.lessons : 0,
                            quizQuestions: typeof data.quizQuestions === 'number' ? data.quizQuestions : 0,
                        })
                    } else {
                        console.error("Invalid stats data:", data)
                        // Set default values on error
                        setStats({
                            courses: 0,
                            lessons: 0,
                            quizQuestions: 0,
                        })
                    }
                    setLoading(false)
                })
                .catch((error) => {
                    console.error("Failed to fetch stats:", error)
                    // Set default values on error
                    setStats({
                        courses: 0,
                        lessons: 0,
                        quizQuestions: 0,
                    })
                    setLoading(false)
                })
        }

        // Fetch immediately
        fetchStats()

        // Auto-refresh every 30 seconds for real-time updates
        const interval = setInterval(fetchStats, 30000)

        return () => clearInterval(interval)
    }, [])

    if (loading) {
        return (
            <section className="bg-card border-t border-b border-border py-16">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <h2 className="text-3xl font-bold tracking-tighter text-center mb-12">
                        Platform Statistics
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="p-8 border-2 animate-pulse">
                                <div className="h-12 w-12 bg-muted rounded-full mb-4" />
                                <div className="h-8 bg-muted rounded mb-2 w-24" />
                                <div className="h-4 bg-muted rounded w-32" />
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        )
    }

    if (!stats) return null

    const statsData = [
        {
            icon: BookOpen,
            value: stats.courses,
            label: "Courses Generated",
            color: "text-primary",
        },
        {
            icon: FileText,
            value: stats.lessons,
            label: "Lessons Created",
            color: "text-accent",
        },
        {
            icon: HelpCircle,
            value: stats.quizQuestions,
            label: "Quiz Questions",
            color: "text-secondary",
        },
    ]

    return (
        <section className="bg-card border-t border-b border-border py-16">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <h2 className="text-3xl font-bold tracking-tighter text-center mb-12">
                    Platform Statistics
                </h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {statsData.map((stat, index) => (
                        <Card
                            key={index}
                            className="p-8 border-2 border-border text-center hover:border-primary transition-colors"
                        >
                            <stat.icon className={`h-12 w-12 ${stat.color} mx-auto mb-4`} />
                            <div className="text-4xl font-bold mb-2">
                                <AnimatedCounter value={stat.value} />
                            </div>
                            <p className="text-muted-foreground font-medium">{stat.label}</p>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}
