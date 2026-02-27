// Separate metadata file for the signup page (client component can't export metadata directly)
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kyren.vercel.app'

export const metadata: Metadata = {
    title: 'Sign Up Free – Kyren AI Learning Platform',
    description:
        'Create your free Kyren account and start learning with AI. Generate structured courses on any topic, take interactive quizzes, track your progress, and earn certificates. Join thousands of learners today.',
    keywords: [
        'Kyren sign up',
        'Kyren register',
        'Kyren free account',
        'join Kyren',
        'AI learning platform signup',
        'free online courses',
        'learn with AI',
    ],
    alternates: {
        canonical: `${SITE_URL}/auth/signup`,
    },
    openGraph: {
        title: 'Sign Up Free – Join Kyren',
        description:
            'Join Kyren for free and start your AI-powered learning journey. Create your first AI course in seconds.',
        url: `${SITE_URL}/auth/signup`,
    },
    robots: {
        index: true,
        follow: true,
    },
}
