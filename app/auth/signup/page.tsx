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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Chrome, Eye, EyeOff, BookOpen, GraduationCap, School } from "lucide-react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<"student" | "tutor" | "teacher">("student")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            role: role,
          },
        },
      })

      if (signUpError) throw signUpError

      // If user is a tutor, we might want to initialize their profile here too,
      // but ideally that happens via trigger or on first login.
      // For now, let's rely on metadata being passed.

      router.push("/auth/signup-success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during sign up")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError(null)
    setIsGoogleLoading(true)

    const supabase = createClient()

    try {
      // Note: Google signup doesn't easily let us pass custom data upfront without backend logic.
      // The user will default to 'student' via database default if not set.
      // We could add a step after login to select role if it's missing.
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
      setError(err instanceof Error ? err.message : "An error occurred during Google signup")
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-background">
      <div className="w-full max-w-md">
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-3xl">Create Account</CardTitle>
            <CardDescription>Join Kyren and start your learning journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Google OAuth Button */}
              <Button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isGoogleLoading || isLoading}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 hover:text-black border-2 border-border hover:border-accent hover:ring-2 hover:ring-accent/20 text-base font-bold py-6 transition-all"
                variant="outline"
              >
                <Chrome className="mr-2 h-5 w-5 text-gray-700" />
                {isGoogleLoading ? "Connecting..." : "Sign up with Google"}
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
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="border-border border-2"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Join As</Label>
                  <RadioGroup defaultValue="student" value={role} onValueChange={(val) => setRole(val as "student" | "tutor" | "teacher")} className="grid grid-cols-3 gap-4">
                    <div>
                      <RadioGroupItem value="student" id="student" className="peer sr-only" />
                      <Label
                        htmlFor="student"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer h-full"
                      >
                        <BookOpen className="mb-2 h-6 w-6" />
                        Student
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="tutor" id="tutor" className="peer sr-only" />
                      <Label
                        htmlFor="tutor"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer h-full"
                      >
                        <GraduationCap className="mb-2 h-6 w-6" />
                        Tutor
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="teacher" id="teacher" className="peer sr-only" />
                      <Label
                        htmlFor="teacher"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer h-full"
                      >
                        <School className="mb-2 h-6 w-6" />
                        Teacher
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-border border-2 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">Toggle confirm password visibility</span>
                    </Button>
                  </div>
                </div>

                {error && <div className="p-3 bg-red-100 border-2 border-red-500 text-red-900 text-sm">{error}</div>}

                <Button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full bg-primary text-primary-foreground border-2 border-primary text-base font-bold py-6"
                >
                  {isLoading ? "Creating account..." : "Sign Up"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="underline underline-offset-4 font-semibold">
                    Login
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
