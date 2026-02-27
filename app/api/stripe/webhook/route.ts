import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { getAdminClient } from '@/lib/supabase/server-admin'
import { sendProPlanConfirmation, sendPlanCancellationEmail } from '@/lib/mail'

export async function POST(req: Request) {
    const body = await req.text()
    const signature = headers().get('Stripe-Signature')

    if (!signature) {
        return new NextResponse('No signature provided', { status: 400 })
    }

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (error: any) {
        console.error("Webhook signature verification failed:", error.message)
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
    }

    const session = event.data.object as Stripe.Checkout.Session
    const supabaseAdmin = getAdminClient()

    if (event.type === 'checkout.session.completed') {
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
        ) as Stripe.Subscription

        if (!session?.metadata?.userId) {
            return new NextResponse('User ID is required', { status: 400 })
        }

        // Upsert profile with subscription details using Admin Client (bypasses RLS)
        const { error } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: session.metadata.userId,
                stripe_subscription_id: subscription.id,
                stripe_customer_id: subscription.customer as string,
                subscription_status: subscription.status,
                subscription_plan: 'pro', // Assuming simple pro plan for now
                current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            })

        if (error) {
            console.error('Error updating profile:', error)
            return new NextResponse('Database Error', { status: 500 })
        }

        // Send Pro Plan Welcome Email
        if (session.customer_details?.email) {
            const userName = session.customer_details.name || 'Creator'
            await sendProPlanConfirmation(session.customer_details.email, userName)
        }
    }

    if (event.type === 'invoice.payment_succeeded') {
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
        ) as Stripe.Subscription

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({
                subscription_status: subscription.status,
                current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id)

        if (error) {
            console.error('Error updating invoice:', error)
        }
    }

    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as Stripe.Subscription;

        // Fetch user from db to get email to send cancellation mail
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_subscription_id', subscription.id)
            .single()

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({
                subscription_status: 'canceled',
                subscription_plan: 'free',
            })
            .eq('stripe_subscription_id', subscription.id)

        if (error) {
            console.error('Error handling subscription deletion:', error)
        }

        if (profile) {
            // Find the user's email from Auth via Admin client
            const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(profile.id)
            if (authUser && authUser.email) {
                const userName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Creator'
                await sendPlanCancellationEmail(authUser.email, userName)
            }
        }
    }

    return new NextResponse(null, { status: 200 })
}
