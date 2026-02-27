import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get query parameters
        const { searchParams } = new URL(req.url)
        const subject = searchParams.get('subject')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        // Build query
        let query = supabase
            .from('doubt_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        // Filter by subject if provided
        if (subject && subject !== 'all') {
            query = query.eq('detected_subject', subject)
        }

        const { data, error } = await query

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: data || [],
            count: data?.length || 0
        })

    } catch (error) {
        console.error('History fetch error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch history' },
            { status: 500 }
        )
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const { error } = await supabase
            .from('doubt_history')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) {
            console.error('Delete error:', error)
            return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Delete error:', error)
        return NextResponse.json(
            { error: 'Failed to delete' },
            { status: 500 }
        )
    }
}
