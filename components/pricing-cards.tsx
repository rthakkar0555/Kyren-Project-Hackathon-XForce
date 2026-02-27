"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Check } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface PricingCardProps {
    title: string
    description: string
    price: string
    priceSuffix?: string
    subtext?: string
    features: string[]
    priceId?: string
    isCurrent?: boolean
    onUpgrade?: (priceId: string) => void
    variant: 'default' | 'yellow' | 'red'
    buttonText: string
    popular?: boolean
    headerTitle?: string // The "Normal User" part
}

export function PricingCard({
    title,
    description,
    price,
    priceSuffix,
    subtext,
    features,
    priceId,
    isCurrent,
    onUpgrade,
    variant,
    buttonText,
    popular,
    headerTitle
}: PricingCardProps) {
    const [loading, setLoading] = useState(false)

    const handleUpgrade = async () => {
        if (!priceId || !onUpgrade) return
        setLoading(true)
        try {
            await onUpgrade(priceId)
        } catch (error) {
            console.error(error)
            toast.error("Something went wrong with the subscription process.")
        } finally {
            setLoading(false)
        }
    }

    const styles = {
        default: {
            border: "border-black",
            bg: "bg-white",
            button: "bg-white text-black border-2 border-black hover:bg-gray-100",
            title: "text-black",
            icon: "text-red-500" // The arrows in the screenshot look red/orange
        },
        yellow: {
            border: "border-secondary",
            bg: "bg-secondary/10",
            button: "bg-secondary text-secondary-foreground hover:bg-secondary/90 border-none",
            title: "text-black",
            icon: "text-red-500"
        },
        red: {
            border: "border-red-500",
            bg: "bg-red-50",
            button: "bg-red-500 text-white hover:bg-red-600 border-none",
            title: "text-red-500",
            icon: "text-red-500"
        }
    }

    const currentStyle = styles[variant]

    return (
        <Card className={cn("flex flex-col relative border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none h-full", currentStyle.border, currentStyle.bg)}>
            {popular && (
                <div className="absolute top-0 right-0 bg-secondary text-secondary-foreground text-xs font-bold px-3 py-1 uppercase tracking-wider">
                    Popular
                </div>
            )}

            <CardHeader className="pb-4">
                <h3 className="text-xl font-bold">{headerTitle || title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
                <div className="mt-4">
                    <span className={cn("text-5xl font-extrabold", variant === 'red' ? 'text-black' : 'text-black')}>{price}</span>
                    {priceSuffix && <span className="text-sm font-medium text-gray-500 ml-1">{priceSuffix}</span>}
                </div>
                {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
            </CardHeader>

            <CardContent className="flex-1">
                <ul className="space-y-3 mt-2">
                    {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <ArrowRight className={cn("h-4 w-4 mt-1 shrink-0", currentStyle.icon)} />
                            <span className="text-sm font-medium text-gray-800">{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>

            <CardFooter className="pt-4">
                <Button
                    className={cn("w-full rounded-none font-bold py-6 text-md transition-all", currentStyle.button)}
                    disabled={loading || isCurrent || (!priceId && variant !== 'default' && variant !== 'yellow')} // Allow generic buttons to click if needed, but per logic
                    onClick={() => {
                        if (priceId && onUpgrade) handleUpgrade()
                    }}
                >
                    {loading ? "Processing..." : buttonText}
                </Button>
            </CardFooter>
        </Card>
    )
}

export function PricingSection() {
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

    const TIERS = [
        {
            headerTitle: "Normal User",
            title: "Free",
            description: "For trying out the platform",
            price: "Free",
            features: ["1 Course (Lifetime)", "8 Modules / Course", "Standard AI Processing", "No Certificate"],
            priceId: "",
            variant: 'default' as const,
            buttonText: "Get Started"
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
            popular: true
        },
        {
            headerTitle: "Pro User",
            title: "Pro User",
            description: "For serious creators",
            price: "$29",
            priceSuffix: "/ month",
            features: ["Unlimited Courses", "8 Modules / Course", "Priority AI Model", "Certificate Downloads"],
            priceId: "price_1St72JFH9WJ7wTwLtHrbfKrs", // Keep the ID user gave, but warn them about price diff
            variant: 'red' as const,
            buttonText: "Upgrade to Pro"
        }
    ]

    return (
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto p-4">
            {TIERS.map((tier, i) => (
                <PricingCard
                    key={i}
                    {...tier}
                    onUpgrade={handleCheckout}
                />
            ))}
        </div>
    )
}


