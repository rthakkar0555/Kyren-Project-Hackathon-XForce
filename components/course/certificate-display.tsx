"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Award, XCircle } from "lucide-react"

interface CertificateDisplayProps {
    courseTitle: string
    studentName: string
    completionDate: string
    averageScore: number
    totalLessons: number
    completedLessons: number
}

export default function CertificateDisplay({
    courseTitle,
    studentName,
    completionDate,
    averageScore,
    totalLessons,
    completedLessons
}: CertificateDisplayProps) {

    const isEligible = completedLessons >= totalLessons && averageScore >= 80

    if (!isEligible) {
        return (
            <Card className="p-8 border-2 border-dashed border-border flex flex-col items-center justify-center text-center space-y-4 bg-muted/20">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                    <Award className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">Course Certificate</h3>
                    <p className="text-muted-foreground max-w-md">
                        Complete all {totalLessons} lessons and achieve an average quiz score of 80% or higher to unlock your certificate.
                    </p>
                </div>
                <div className="flex gap-4 text-sm mt-2">
                    <Badge variant="outline" className={completedLessons >= totalLessons ? "bg-green-100 text-green-700" : ""}>
                        {completedLessons}/{totalLessons} Lessons
                    </Badge>
                    <Badge variant="outline" className={averageScore >= 80 ? "bg-green-100 text-green-700" : ""}>
                        {averageScore}% Avg. Score
                    </Badge>
                </div>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Award className="h-6 w-6 text-yellow-500" />
                Your Certificate
            </h2>

            <div className="relative border-8 border-double border-yellow-600/30 p-10 bg-[#FFFAF0] text-center shadow-lg rounded-lg max-w-3xl mx-auto">
                {/* Decorative corners */}
                <div className="absolute top-2 left-2 w-16 h-16 border-t-4 border-l-4 border-yellow-600 rounded-tl-xl opacity-50"></div>
                <div className="absolute top-2 right-2 w-16 h-16 border-t-4 border-r-4 border-yellow-600 rounded-tr-xl opacity-50"></div>
                <div className="absolute bottom-2 left-2 w-16 h-16 border-b-4 border-l-4 border-yellow-600 rounded-bl-xl opacity-50"></div>
                <div className="absolute bottom-2 right-2 w-16 h-16 border-b-4 border-r-4 border-yellow-600 rounded-br-xl opacity-50"></div>

                <div className="space-y-6">
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-gray-900 tracking-wider uppercase mb-2">Certificate of Completion</h1>
                        <p className="text-yellow-700 font-medium">Proudly Presented To</p>
                    </div>

                    <div className="py-4 border-b-2 border-gray-200 max-w-lg mx-auto">
                        <h2 className="text-3xl font-serif italic text-primary">{studentName}</h2>
                    </div>

                    <div className="space-y-2">
                        <p className="text-gray-600">For successfully completing the course</p>
                        <h3 className="text-2xl font-bold text-gray-800">{courseTitle}</h3>
                        <p className="text-gray-600">with Distinction (Score: {averageScore}%)</p>
                    </div>

                    <div className="pt-8 flex justify-between items-end text-sm text-gray-500 font-serif">
                        <div className="text-center">
                            <div className="w-32 border-t border-gray-400 mb-1"></div>
                            <p>Date: {completionDate}</p>
                        </div>
                        <div className="h-20 w-20 flex items-center justify-center rounded-full border-4 border-yellow-500 text-yellow-600 font-bold text-xs rotate-[-15deg] shadow-sm bg-white">
                            OFFICIAL
                            <br />
                            CERTIFIED
                        </div>
                        <div className="text-center">
                            <div className="w-32 border-t border-gray-400 mb-1"></div>
                            <p>Kyren Platform</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center">
                <Button className="gap-2" onClick={() => window.print()}>
                    <Download className="h-4 w-4" />
                    Download / Print Certificate
                </Button>
            </div>
        </div>
    )
}
