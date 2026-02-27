"use client"

import { Award, Download, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useState } from "react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

interface CourseCompletionCardProps {
    learnerName: string
    courseTitle: string
    score?: number
    status?: string
    certificateIssued?: boolean
    userPlan?: string
}

export default function CourseCompletionCard({
    learnerName,
    courseTitle,
    score = 100,
    status = "Completed",
    certificateIssued = true,
    userPlan = "Normal User"
}: CourseCompletionCardProps) {
    const [isCertificateOpen, setIsCertificateOpen] = useState(false)
    const isNormalUser = userPlan === "Normal User"

    return (
        <Card className="w-full max-w-3xl mx-auto border-2 shadow-sm">
            <CardHeader className="text-center pb-8 pt-8">
                <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <Award className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold tracking-tight">
                    Course Completed!
                </CardTitle>
                <CardDescription className="text-lg mt-2 max-w-xl mx-auto">
                    Outstanding performance, <span className="font-medium text-foreground">{learnerName}</span>.
                    You have successfully mastered <span className="font-medium text-foreground">"{courseTitle}"</span>.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pb-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-center border">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-green-500" />
                            <span className="font-bold text-lg">{status}</span>
                        </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center border">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">Score</p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="font-bold text-lg text-primary">{score}%</span>
                        </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center border">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">Certificate</p>
                        <div className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span className="font-bold text-lg">{certificateIssued ? "Issued" : "Pending"}</span>
                        </div>
                    </div>
                </div>

                <div className="border-t my-6" />

                <div className="flex justify-center">
                    {isNormalUser ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Award className="h-5 w-5" />
                                <p className="font-medium">Certificate Available with Upgrade</p>
                            </div>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Upgrade to Pro or Educational plan to download your certificate and unlock unlimited courses.
                            </p>
                            <Button size="lg" className="min-w-[200px]">
                                Upgrade to Download Certificate
                            </Button>
                        </div>
                    ) : (
                        <Dialog open={isCertificateOpen} onOpenChange={setIsCertificateOpen}>
                            <DialogTrigger asChild>
                                <Button size="lg" className="min-w-[200px] text-base">
                                    <Award className="mr-2 h-5 w-5" />
                                    View & Download Certificate
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[1000px] w-full p-0 overflow-hidden bg-background">
                                <div className="flex flex-col items-center">
                                    <div className="relative w-full bg-muted/20 shrink-0 border-b">
                                        <img
                                            src="/certificate-universal.png"
                                            alt="Certificate of Completion"
                                            className="w-full h-auto block"
                                            style={{ aspectRatio: "1.414/1" }}
                                        />
                                    </div>
                                    <div className="p-4 w-full flex justify-end gap-2 bg-muted/10">
                                        <Button variant="outline" onClick={() => setIsCertificateOpen(false)}>
                                            Close
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                const link = document.createElement("a");
                                                link.href = "/certificate-universal.png";
                                                link.download = "Kyren_Certificate_of_Completion.png";
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }}
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Download PDF
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
