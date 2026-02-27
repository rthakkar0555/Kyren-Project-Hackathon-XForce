import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { absoluteUrl } from '@/lib/utils'

const settingsUrl = absoluteUrl('/dashboard/settings')

export async function GET(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !user.email) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const priceId = searchParams.get('priceId')

        if (!priceId) {
            return new NextResponse("Price ID is required", { status: 400 })
        }

        const stripeSession = await stripe.checkout.sessions.create({
            success_url: absoluteUrl('/payment/success?session_id={CHECKOUT_SESSION_ID}&plan_id=pro'),
            cancel_url: settingsUrl,
            payment_method_types: ['card'],
            mode: 'subscription',
            billing_address_collection: 'auto',
            customer_email: user.email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            metadata: {
                userId: user.id,
            },
        })

        return new NextResponse(JSON.stringify({ url: stripeSession.url }))

    } catch (error) {
        console.log('[STRIPE_GET]', error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
