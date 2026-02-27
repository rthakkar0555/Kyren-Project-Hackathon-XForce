import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { DM_Sans, Space_Mono, Source_Serif_4 } from 'next/font/google'

const _dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'] })
const _spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'] })
const _sourceSerif4 = Source_Serif_4({ subsets: ['latin'], weight: ['400', '600', '700'] })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kyren.vercel.app'
const SITE_NAME = 'Kyren'
const SITE_TAGLINE = 'AI-Powered Learning Platform – Learn Beyond Expectations'
const SITE_DESCRIPTION =
    'Kyren is an AI-powered learning platform that transforms any topic into structured courses with interactive quizzes, progress tracking, live collaboration, and certificates.'

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    ],
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
}

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: `${SITE_NAME} – ${SITE_TAGLINE}`,
        template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    authors: [{ name: 'Kyren Team', url: SITE_URL }],
    creator: 'Kyren',
    publisher: 'Kyren',
    generator: 'Next.js',
    applicationName: SITE_NAME,
    category: 'education',
    robots: {
        index: true,
        follow: true,
    },
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" dir="ltr">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className="font-sans antialiased">
                {children}
                <Analytics />
            </body>
        </html>
    )
}
