// Separate metadata file for the login page (client component can't export metadata directly)
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kyren.vercel.app'

export const metadata: Metadata = {
    title: 'Login – Kyren AI Learning Platform',
    description:
        'Log in to your Kyren account to access your AI-generated courses, track progress, join classrooms, and earn certificates. Your learning journey continues here.',
    keywords: ['Kyren login', 'Kyren sign in', 'Kyren account', 'AI learning login'],
    alternates: {
        canonical: `${SITE_URL}/auth/login`,
    },
    openGraph: {
        title: 'Login to Kyren',
        description: 'Access your Kyren dashboard and continue your AI-powered learning journey.',
        url: `${SITE_URL}/auth/login`,
    },
    robots: {
        index: true,
        follow: true,
    },
}
