"use client"

export default function PlatformsMarquee() {
    const platforms = [
        { name: "Coursera", color: "text-[#0056D2]" },
        { name: "Udemy", color: "text-[#A435F0]" },
        { name: "edX", color: "text-[#02262B]" },
        { name: "Khan Academy", color: "text-[#14BF96]" },
        { name: "Skillshare", color: "text-[#00D9B1]" },
        { name: "LinkedIn Learning", color: "text-[#0A66C2]" },
        { name: "Pluralsight", color: "text-[#F15B2A]" },
        { name: "Udacity", color: "text-[#01B3E3]" },
        { name: "FutureLearn", color: "text-[#DE00A5]" },
        { name: "Codecademy", color: "text-[#1F4056]" },
    ]

    // Duplicate the platforms array for seamless loop
    const duplicatedPlatforms = [...platforms, ...platforms]

    return (
        <section className="py-16 bg-muted/30 border-t border-b border-border overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 md:px-8 mb-8">
                <h2 className="text-3xl font-bold tracking-tighter text-center">Trusted by Builders at</h2>
                <p className="text-muted-foreground text-center mt-2">
                    Join the ecosystem of leading learning platforms
                </p>
            </div>

            <div className="relative">
                {/* Gradient overlays for fade effect */}
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />

                {/* Scrolling container */}
                <div className="flex animate-marquee-left whitespace-nowrap">
                    {duplicatedPlatforms.map((platform, index) => (
                        <div
                            key={`${platform.name}-${index}`}
                            className="inline-flex items-center justify-center px-8 mx-4"
                        >
                            <span className={`text-3xl md:text-4xl font-bold ${platform.color} tracking-tight`}>
                                {platform.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
