"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"

export default function AdminLoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        const supabase = createClient()

        try {
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (loginError) throw loginError

            router.push("/admin")
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred during login")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-background">
            <div className="w-full max-w-md">
                <Card className="border-2 border-border">
                    <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-6 w-6 text-primary" />
                            <span className="text-sm font-bold text-primary uppercase tracking-wider">Admin Portal</span>
                        </div>
                        <CardTitle className="text-3xl">Admin Access</CardTitle>
                        <CardDescription>Login to view system analytics</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@kyren.ai"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="border-border border-2"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="border-border border-2"
                                    required
                                />
                            </div>

                            {error && <div className="p-3 bg-red-100 border-2 border-red-500 text-red-900 text-sm">{error}</div>}

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-primary text-primary-foreground border-2 border-primary text-base font-bold py-6"
                            >
                                {isLoading ? "Logging in..." : "Login to Admin"}
                            </Button>

                            <div className="text-center text-sm text-muted-foreground">
                                <Link href="/" className="underline underline-offset-4 font-semibold">
                                    Back to Website
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
