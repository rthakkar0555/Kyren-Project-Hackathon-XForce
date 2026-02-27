import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-background">
      <div className="w-full max-w-md">
        <Card className="border-2 border-border text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-3xl">Account Created!</CardTitle>
            <CardDescription>Check your email to confirm your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              We&apos;ve sent a confirmation email to your inbox. Click the link in the email to verify your account and
              start creating courses.
            </p>

            <Link href="/auth/login">
              <Button className="w-full bg-primary text-primary-foreground border-2 border-primary text-base font-bold py-6">
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
