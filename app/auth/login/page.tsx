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
import { Chrome, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
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

      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during login")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setIsGoogleLoading(true)

    const supabase = createClient()

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (googleError) throw googleError
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during Google login")
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-background">
      <div className="w-full max-w-md">
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-3xl">Welcome Back</CardTitle>
            <CardDescription>Login to your Kyren account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Google OAuth Button */}
              <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 hover:text-black border-2 border-border hover:border-accent hover:ring-2 hover:ring-accent/20 text-base font-bold py-6 transition-all"
                variant="outline"
              >
                <Chrome className="mr-2 h-5 w-5 text-gray-700" />
                {isGoogleLoading ? "Connecting..." : "Continue with Google"}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t-2 border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-border border-2"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-border border-2 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">Toggle password visibility</span>
                    </Button>
                  </div>
                </div>

                {error && <div className="p-3 bg-red-100 border-2 border-red-500 text-red-900 text-sm">{error}</div>}

                <Button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full bg-primary text-primary-foreground border-2 border-primary text-base font-bold py-6"
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/signup" className="underline underline-offset-4 font-semibold">
                    Sign up
                  </Link>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
