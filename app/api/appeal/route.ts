import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        console.log('[Appeal API] User:', user?.id, user?.email)

        if (!user) {
            console.log('[Appeal API] No user found')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check ban status directly from user metadata
        const isBanned = user.user_metadata?.banned === true
        console.log('[Appeal API] User banned status:', isBanned)

        if (!isBanned) {
            console.log('[Appeal API] User is not banned')
            return NextResponse.json({ error: 'User is not banned' }, { status: 400 })
        }

        const body = await request.json()
        const { appeal_reason } = body

        console.log('[Appeal API] Appeal reason length:', appeal_reason?.length)

        if (!appeal_reason || appeal_reason.trim().length < 50) {
            console.log('[Appeal API] Appeal too short')
            return NextResponse.json({ error: 'Appeal reason must be at least 50 characters' }, { status: 400 })
        }

        // Check for existing pending appeal
        const { data: existingAppeal, error: checkError } = await supabase
            .from('ban_appeals')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .maybeSingle()

        if (checkError) {
            console.error('[Appeal API] Error checking existing appeal:', checkError)
        }

        console.log('[Appeal API] Existing appeal:', existingAppeal)

        if (existingAppeal) {
            console.log('[Appeal API] User already has pending appeal')
            return NextResponse.json({ error: 'You already have a pending appeal' }, { status: 400 })
        }

        // Create appeal
        console.log('[Appeal API] Attempting to insert appeal...')
        const { data, error } = await supabase
            .from('ban_appeals')
            .insert({
                user_id: user.id,
                user_email: user.email || '',
                appeal_reason: appeal_reason.trim(),
                status: 'pending'
            })
            .select()
            .single()

        if (error) {
            console.error('[Appeal API] Insert error:', error)
            return NextResponse.json({
                error: `Failed to submit appeal: ${error.message}`,
                code: error.code,
                details: error.details
            }, { status: 500 })
        }

        if (!data) {
            console.error('[Appeal API] No data returned after insert')
            return NextResponse.json({ error: 'Failed to create appeal - no data returned' }, { status: 500 })
        }

        console.log('[Appeal API] Success! Appeal created:', data.id)

        return NextResponse.json({
            success: true,
            message: 'Appeal submitted successfully. Our team will review it shortly.',
            appeal: data
        }, { status: 200 })

    } catch (error) {
        console.error('[Appeal API] Unexpected error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
