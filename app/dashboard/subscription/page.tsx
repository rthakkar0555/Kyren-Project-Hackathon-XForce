"use client"

import { useEffect, useState } from "react"
import { PricingCard } from "@/components/pricing-cards"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function SubscriptionPage() {
    const [loading, setLoading] = useState(true)
    const [currentPlan, setCurrentPlan] = useState<string>('free')

    useEffect(() => {
        // Fetch current usage/plan
        fetch('/api/user/usage')
            .then(res => res.json())
            .then(data => {
                if (data.plan_name === 'Pro User') setCurrentPlan('pro')
                else if (data.plan_name === 'Educational User') setCurrentPlan('edu')
                else setCurrentPlan('free')
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    const handleCheckout = async (priceId: string) => {
        try {
            const response = await fetch(`/api/stripe/checkout?priceId=${priceId}`)
            const data = await response.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                toast.error("Failed to start checkout.")
            }
        } catch (error) {
            console.error("Checkout error:", error)
            toast.error("Failed to start checkout.")
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>

    const TIERS = [
        {
            headerTitle: "Normal User",
            title: "Free",
            description: "For trying out the platform",
            price: "Free",
            features: ["1 Course (Lifetime)", "6 modules / Course", "Standard AI Processing", "No Certificate"],
            priceId: "",
            variant: 'default' as const,
            buttonText: "Get Started",
            isCurrent: currentPlan === 'free',
        },
        {
            headerTitle: "Educational",
            title: "Free",
            description: "For students & educators",
            price: "Free",
            priceSuffix: "/ year",
            subtext: "Requires .edu.in email",
            features: ["12 Courses / Year", "4 Modules / Course", "Certificate Included", "Priority verified badge"],
            priceId: "",
            variant: 'yellow' as const,
            buttonText: "Sign Up with .edu.in",
            popular: true,
            isCurrent: currentPlan === 'edu',
        },
        {
            headerTitle: "Pro User",
            title: "Pro User",
            description: "For serious creators",
            price: "$29",
            priceSuffix: "/ month",
            features: ["Unlimited Courses", "6 modules / Course", "Priority AI Model", "Certificate Downloads"],
            priceId: "price_1St72JFH9WJ7wTwLtHrbfKrs",
            variant: 'red' as const,
            buttonText: "Upgrade to Pro",
            isCurrent: currentPlan === 'pro',
            onUpgrade: handleCheckout
        }
    ]

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">Subscription Plans</h1>
                <p className="text-muted-foreground">Manage your plan and usage limits</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {TIERS.map((tier, i) => (
                    <PricingCard
                        key={i}
                        {...tier}
                        onUpgrade={handleCheckout}
                    />
                ))}
            </div>
        </div>
    )
}
