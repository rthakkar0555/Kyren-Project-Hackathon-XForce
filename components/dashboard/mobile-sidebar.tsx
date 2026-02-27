"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import Sidebar from "./sidebar"

interface MobileSidebarProps {
    userRole?: "student" | "tutor" | "teacher" | "admin"
}

export function MobileSidebar({ userRole = "student" }: MobileSidebarProps) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden shrink-0">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-0 flex bg-card w-64 w-[280px]">
                {/* We override classname to force display:flex and stretch */}
                <Sidebar userRole={userRole} className="w-full h-full flex md:flex !border-r-0" />
            </SheetContent>
        </Sheet>
    )
}
