import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { plan_id } = await req.json()

        // MOCKED CHECKOUT FOR DEVELOPMENT
        // Since backend is offline, we simulate a successful checkout session creation
        // In production, this would call Stripe

        console.log("Mocking checkout for plan:", plan_id)

        // Simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1000))

        return NextResponse.json({
            checkout_url: "/payment/success?session_id=mock_session_id"
        })
    } catch (error) {
        console.error("Checkout Mock Error", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
