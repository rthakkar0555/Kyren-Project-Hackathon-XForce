"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Zap, AlertTriangle, ArrowUpCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export function UsageStats() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const router = useRouter()

    const handleUpgrade = async () => {
        try {
            // Using the Pro Price ID consistent with SubscriptionPage
            const proPriceId = "price_1St72JFH9WJ7wTwLtHrbfKrs"
            const res = await fetch(`/api/stripe/checkout?priceId=${proPriceId}`, {
                method: 'GET', // Stripe route is GET
            })
            if (res.ok) {
                const data = await res.json()
                if (data.url) {
                    window.location.href = data.url
                } else {
                    console.error("No checkout URL returned")
                }
            } else {
                console.error("Upgrade request failed")
            }
        } catch (e) {
            console.error("Upgrade failed", e)
        }
    }

    useEffect(() => {
        fetch('/api/user/usage')
            .then(res => {
                if (!res.ok) throw new Error("Failed")
                return res.json()
            })
            .then(data => setStats(data))
            .catch(() => setError(true))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="text-sm text-muted-foreground">Loading usage...</div>
    if (error) return null

    const usagePercent = (stats.courses_created / stats.max_courses) * 100

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Plan Usage ({stats.plan_name})</CardTitle>
                <CardDescription>Courses Created</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold">{stats.courses_created} / {stats.max_courses}</span>
                    <Zap className={`h-4 w-4 ${usagePercent >= 100 ? 'text-destructive' : 'text-primary'}`} />
                </div>
                <Progress value={usagePercent} className="h-2 mb-4" />

                {usagePercent >= 100 && (
                    <Alert variant="destructive" className="py-2 mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Limit Reached</AlertTitle>
                        <AlertDescription className="text-xs">
                            Upgrade to create more.
                        </AlertDescription>
                    </Alert>
                )}

                {stats.plan_name === 'Normal User' && (
                    <Button size="sm" className="w-full mt-2" onClick={handleUpgrade}>
                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                        Upgrade to Pro
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}
