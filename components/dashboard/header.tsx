import type { User } from "@supabase/supabase-js"
import { NotificationBell } from "./notification-bell"

import { MobileSidebar } from "./mobile-sidebar"

export default function Header({ user, userRole }: { user: User, userRole?: "student" | "tutor" | "teacher" | "admin" }) {
  return (
    <header className="border-b-4 border-border bg-card px-4 md:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        <MobileSidebar userRole={userRole} />
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground hidden md:block">Welcome back,</p>
          <p className="text-base md:text-lg font-bold truncate">
            {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell userId={user.id} />
        <div className="text-right">
          <p className="text-sm text-muted-foreground">v0.1.0</p>
        </div>
      </div>
    </header>
  )
}
