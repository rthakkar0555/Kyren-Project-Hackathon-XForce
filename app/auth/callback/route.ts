import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createOrUpdateProfile } from "@/lib/auth-utils"
import { sendWelcomeEmail } from "@/lib/mail"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  let next = searchParams.get("next") || "/dashboard"

  // Fix dev tunnel / proxy routing by checking forwarded host headers
  // NextJS often resolves request.url to localhost internally when behind a tunnel, which breaks client redirects
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

  let baseOrigin = request.nextUrl.origin
  if (forwardedHost) {
    baseOrigin = `${forwardedProto}://${forwardedHost}`
  }

  if (code) {
    const supabase = await createClient()

    try {
      // Exchange code for session
      const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

      if (sessionError) {
        console.error('Session exchange error:', sessionError)
        return NextResponse.redirect(new URL('/auth/login?error=auth_failed', baseOrigin))
      }

      if (session?.user) {
        const user = session.user

        // Determine if this is a BRAND NEW account or an existing one
        // We compare the creation time vs the last sign in time
        const createdAt = new Date(user.created_at).getTime()
        const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : createdAt

        // Get user metadata
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null
        const email = user.email || ''

        // Determine OAuth provider
        const oauthProvider = user.app_metadata?.provider || null

        // If they signed in within 5 seconds of the account being created, it's a new signup
        if (Math.abs(lastSignInAt - createdAt) < 5000) {
          next = "/auth/signup-success"
          // We trigger the welcome email for new Google/OAuth signups
          if (email) {
            // Un-awaited so we don't hold up the redirect for too long if possible,
            // but actually, Edge functions might cancel it. Since it's a redirect, we better await it.
            try {
              await sendWelcomeEmail(email, fullName || "Student")
            } catch (e) {
              console.error("Failed to send welcome email:", e)
            }
          }
        }

        try {
          // Create or update profile with automatic plan assignment
          await createOrUpdateProfile(
            user.id,
            email,
            fullName,
            oauthProvider
          )
        } catch (profileError) {
          console.error('Profile creation error:', profileError)
          // Continue even if profile creation fails
        }
      }
    } catch (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(new URL('/auth/login?error=callback_failed', baseOrigin))
    }
  }

  return NextResponse.redirect(new URL(next, baseOrigin))
}
