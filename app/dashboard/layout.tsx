import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Sidebar from "@/components/dashboard/sidebar"
import Header from "@/components/dashboard/header"
import { Toaster } from "@/components/ui/toaster"
import { GlobalNotifications } from "@/components/dashboard/global-notifications"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch user role from profiles table (preferred) or metadata
  let userRole: "student" | "tutor" | "teacher" | "admin" = "student"

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role) {
    userRole = profile.role as "student" | "tutor" | "teacher" | "admin"
  } else if (user.user_metadata?.role) {
    userRole = user.user_metadata.role
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen">
        <Sidebar userRole={userRole} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={user} userRole={userRole} />
          <main className="flex-1 overflow-auto bg-background">{children}</main>
        </div>
      </div>
      <GlobalNotifications userId={user.id} />
      <Toaster />
    </div>
  )
}
