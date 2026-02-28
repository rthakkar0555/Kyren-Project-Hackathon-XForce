'use server'

import { sendEmail, generateEmailHtml } from "@/lib/mail"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from "next/cache"

export async function sendWarning(userEmail: string, courseTitle: string) {
    const supabase = await createClient()

    // Verify Admin (Optional but recommended)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, message: "Unauthorized" }
    }

    // You might want to check for admin role here if you have roles set up
    // const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    // if (profile?.role !== 'admin') return { success: false, message: "Unauthorized" }

    try {
        const subject = `⚠️ Action Required: Content Warning - ${courseTitle}`
        const html = generateEmailHtml({
            title: "Please Review Your Content",
            badge: { text: "Content Oversight", variant: "warning" },
            bodyParagraphs: [
                "We detected potential policy violations in content generated within your account. At Kyren, we strive to maintain a safe and high-quality learning environment.",
                "Please review our community guidelines to ensure future generations comply with our standards. Repeated violations may result in account restrictions.",
                "If you believe this flag was raised in error, no further action is required at this time, but please be mindful of future prompts."
            ],
            highlightBox: {
                title: "Flagged Content",
                content: `"${courseTitle}"`
            },
            actionPath: "/dashboard",
            actionLabel: "View Dashboard",
            footerText: "This is an automated administrative notification."
        });

        await sendEmail({
            to: userEmail,
            subject,
            text: `Action Required: We detected potential policy violations regarding: "${courseTitle}". Please review our community guidelines.`,
            html,
        })

        console.log(`[Admin] Warning sent to ${userEmail} for course "${courseTitle}"`)

        return { success: true, message: "Warning email sent successfully" }
    } catch (error: any) {
        console.error("[Admin] Failed to send warning:", error)
        return { success: false, message: "Failed to send warning email" }
    }
}

// Real ban implementation
export async function banUserAndDeleteCourse(userId: string, courseId: string, reason: string) {
    try {
        // Use Service Role to bypass RLS and access Auth Admin
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // 1. Ban User (Update Auth Metadata)
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                banned: true,
                ban_reason: reason,
                banned_at: new Date().toISOString()
            }
        })

        if (banError) throw new Error(`Auth Error: ${banError.message}`)

        // 2. Delete Course (Service Role bypasses RLS)
        const { error: dbError } = await supabaseAdmin
            .from('courses')
            .delete()
            .eq('id', courseId)

        if (dbError) throw new Error(`DB Error: ${dbError.message}`)

        console.log(`[Admin] Banned user ${userId} and deleted course ${courseId}`)
        return { success: true, message: "User blocked and content purged." }

    } catch (error: any) {
        console.error("[Admin] Ban Action Failed:", error)
        return { success: false, message: error.message || "Failed to ban user" }
    }
}

// Real unban implementation
export async function unbanUser(userId: string) {
    try {
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                banned: false,
                ban_reason: null,
                unbanned_at: new Date().toISOString()
            }
        })

        if (error) throw error

        console.log(`[Admin] Unbanned user ${userId}`)
        return { success: true, message: "User unbanned successfully." }
    } catch (error: any) {
        console.error("[Admin] Unban Action Failed:", error)
        return { success: false, message: error.message || "Failed to unban user" }
    }
}

export async function approveAppeal(formData: FormData) {
    try {
        const appealId = formData.get('appealId') as string
        const userId = formData.get('userId') as string

        if (!appealId || !userId) {
            throw new Error("Missing appealId or userId")
        }

        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 1. Unban the user
        const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                banned: false,
                ban_reason: null,
                unbanned_at: new Date().toISOString()
            }
        })

        if (unbanError) throw new Error(`Unban Error: ${unbanError.message}`)

        // 2. Update appeal status
        const { error: dbError } = await supabaseAdmin
            .from('ban_appeals')
            .update({ status: 'approved' })
            .eq('id', appealId)

        if (dbError) throw new Error(`DB Error: ${dbError.message}`)

        revalidatePath('/admin/appeals')
        return { success: true }
    } catch (error: any) {
        console.error("[Admin] Approve Appeal Failed:", error)
        return { success: false, message: error.message }
    }
}

export async function rejectAppeal(formData: FormData) {
    try {
        const appealId = formData.get('appealId') as string

        if (!appealId) {
            throw new Error("Missing appealId")
        }

        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Update appeal status
        const { error } = await supabaseAdmin
            .from('ban_appeals')
            .update({ status: 'rejected' })
            .eq('id', appealId)

        if (error) throw error

        revalidatePath('/admin/appeals')
        return { success: true }
    } catch (error: any) {
        console.error("[Admin] Reject Appeal Failed:", error)
        return { success: false, message: error.message }
    }
}
