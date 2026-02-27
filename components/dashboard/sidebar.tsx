"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, StickyNote, LogOut, BarChart3, CreditCard, HelpCircle, User, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface SidebarProps {
  userRole?: "student" | "tutor" | "teacher" | "admin"
  className?: string
}

export default function Sidebar({ userRole = "student", className = "hidden md:flex" }: SidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const isActive = (path: string) => pathname.startsWith(path)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const baseNavItems = [
    { href: "/dashboard", label: "Courses", icon: BookOpen },
    { href: "/dashboard/doubt-assistant", label: "Doubt Assistant", icon: HelpCircle },
    { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/profile", label: "Profile", icon: User },
    { href: "/dashboard/notes", label: "Notes", icon: StickyNote },
  ]

  const navItems = [...baseNavItems]

  // Add Peer-to-Peer for students
  if (userRole === "student") {
    // Insert after Courses (index 1) or wherever appropriate
    navItems.splice(1, 0, { href: "/dashboard/peer-to-peer", label: "Peer-to-Peer", icon: Users })
  }

  // For Tutors, we might want to show "My Content" or "Requests" - for now request says standard UI but add tutor card creation in Profile
  // However, Tutors also need to see requests.
  if (userRole === "tutor") {
    navItems.splice(1, 0, { href: "/dashboard/peer-to-peer", label: "My Students", icon: Users })
  }

  // Teacher Navigation
  if (userRole === "teacher") {
    // Teachers need "My Classrooms"
    navItems.splice(1, 0, { href: "/dashboard/teacher", label: "My Classrooms", icon: Users })
  } else if (userRole === "student") {
    // Students also need to see "Classroom"
    navItems.splice(1, 0, { href: "/dashboard/classroom", label: "Classroom", icon: Users })
  }

  return (
    <aside className={`w-64 border-r-4 border-border bg-card flex-col shrink-0 h-full ${className}`}>
      <div className="p-6 border-b-4 border-border">
        <h1 className="text-2xl font-bold tracking-tighter">Kyren</h1>
      </div>

      <nav className="flex-1 p-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 font-semibold border-2 transition-all ${isActive(item.href)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary"
                }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-6 border-t-4 border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 font-semibold border-2 border-border hover:border-primary transition-all"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  )
}
