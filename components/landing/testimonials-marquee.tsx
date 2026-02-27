"use client"

import { Card } from "@/components/ui/card"
import { Quote } from "lucide-react"

const testimonials = [
    {
        quote: "I built a RAG-based course with Kyren, and I couldn’t believe the output — it generated an insanely good, well-structured course.",
        name: "Rishi Thakkar",
        role: "Software Engineer at Google",
    },
    {
        quote: "Finally, a course builder that works instantly. A game changer.",
        name: "Malay Sheta",
        role: "Product Manager at Microsoft",
    },
    {
        quote: "The interactive quizzes take learning to the next level.",
        name: "Kris Vora",
        role: "AWS Certified Solutions Architect",
    },
    {
        quote: "I built a full syllabus for my class in minutes. Incredible tool.",
        name: "Sharnam Shah",
        role: "CEO of TechStart",
    },
    {
        quote: "Kyren gives founders a strategic advantage by transforming domain knowledge into ready-to-launch courses with minimal manual effort.",
        name: "Het Patel",
        role: "Co-founder of TechStart",
    },
    {
        quote: "As a UX designer at Airbnb, I admire how Kyren hides AI complexity behind a simple, trustworthy learning experience.",
        name: "Aum Shah",
        role: "UX Designer at Airbnb",
    },
]

export default function TestimonialsMarquee() {
    return (
        <section className="bg-background py-24 overflow-hidden relative">
            <div className="max-w-7xl mx-auto px-4 md:px-8 mb-12 text-center">
                <h2 className="text-4xl font-bold tracking-tighter">What People Say About Kyren</h2>
                <p className="text-muted-foreground mt-4 text-lg">Trusted by professionals from top companies</p>
            </div>

            <div className="relative w-full">
                {/* Gradients for smooth fade effect at edges */}
                <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                <div className="flex w-max animate-marquee space-x-6">
                    {/* Render twice for seamless loop */}
                    {[...testimonials, ...testimonials].map((t, i) => (
                        <Card
                            key={i}
                            className="w-[350px] p-6 border-2 border-border bg-card shrink-0 hover:border-primary transition-colors duration-300"
                        >
                            <Quote className="h-8 w-8 text-primary/20 mb-4" />
                            <p className="text-lg font-medium mb-6 leading-relaxed">"{t.quote}"</p>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20">
                                    {t.name[0]}
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">{t.name}</h4>
                                    <p className="text-xs text-muted-foreground">{t.role}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
        </section>
    )
}
