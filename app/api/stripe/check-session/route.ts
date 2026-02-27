import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getAdminClient } from '@/lib/supabase/server-admin'
import Stripe from 'stripe'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
        return new NextResponse("Session ID is required", { status: 400 })
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId)

        if (session.payment_status === 'paid') {
            // IMMEDIATE SYNC: Update database to ensure user doesn't wait for webhook
            if (session.subscription) {
                const subscription = await stripe.subscriptions.retrieve(
                    session.subscription as string
                ) as Stripe.Subscription

                const supabaseAdmin = getAdminClient()

                // We need the userId. It should be in metadata.
                const userId = session.metadata?.userId

                if (userId) {
                    await supabaseAdmin
                        .from('profiles')
                        .upsert({
                            id: userId,
                            stripe_subscription_id: subscription.id,
                            stripe_customer_id: subscription.customer as string,
                            subscription_status: subscription.status,
                            subscription_plan: 'pro',
                            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
                        })
                }
            }

            return NextResponse.json({ status: 'success', customer_email: session.customer_details?.email })
        } else {
            return NextResponse.json({ status: 'pending' }) // or failed
        }

    } catch (error) {
        console.error("Error retrieving stripe session:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
