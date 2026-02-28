/**
 * Authentication utility functions for OAuth and plan assignment
 */

import { getAdminClient } from '@/lib/supabase/server-admin'

/**
 * Extract email domain from email address
 */
export function getEmailDomain(email: string): string {
    const domain = email.split('@')[1]
    return domain ? domain.toLowerCase() : ''
}

/**
 * Determine subscription plan based on email domain
 */
export function getPlanFromDomain(domain: string): 'free' | 'pro' | 'enterprise' | 'educational' {
    const lowerDomain = domain.toLowerCase()

    // Gmail users get free plan
    if (lowerDomain === 'gmail.com') {
        return 'free'
    }

    // Educational domains get educational plan
    if (
        lowerDomain.endsWith('.edu.in') ||
        lowerDomain === 'edu.in' ||
        lowerDomain.endsWith('.edu') ||
        lowerDomain === 'edu' ||
        lowerDomain.endsWith('.ac.in') ||
        lowerDomain === 'ac.in' ||
        lowerDomain.endsWith('.ac.uk') ||
        lowerDomain === 'ac.uk'
    ) {
        return 'educational'
    }

    // Default to free plan
    return 'free'
}

/**
 * Create or update user profile with OAuth information
 */
export async function createOrUpdateProfile(
    userId: string,
    email: string,
    fullName: string | null,
    oauthProvider: string | null = null
) {
    const supabase = getAdminClient()

    const emailDomain = getEmailDomain(email)
    const subscriptionPlan = getPlanFromDomain(emailDomain)

    // Check if profile exists
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

    if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
            .from('profiles')
            .update({
                email,
                full_name: fullName,
                oauth_provider: oauthProvider,
                email_domain: emailDomain,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

        if (error) {
            console.error('Error updating profile:', error)
            throw error
        }
    } else {
        // Create new profile
        const { error } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                email,
                full_name: fullName,
                oauth_provider: oauthProvider,
                email_domain: emailDomain,
                subscription_plan: subscriptionPlan,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })

        if (error) {
            console.error('Error creating profile:', error)
            throw error
        }
    }

    return { subscriptionPlan, emailDomain }
}
