"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Download, Award } from "lucide-react"

interface CertificateGeneratorProps {
    // Props kept for compatibility but not used in universal design
    learnerName?: string
    courseTitle?: string
    completionDate?: string
}

export default function CertificateGenerator({ }: CertificateGeneratorProps) {
    const [isOpen, setIsOpen] = useState(false)

    const handleDownload = () => {
        // Direct download of the universal certificate file
        const link = document.createElement("a")
        link.href = "/certificate-universal.png"
        link.download = "Kyren_Certificate_of_Completion.png"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6 shadow-lg transition-all hover:scale-[1.02]">
                    <Award className="mr-2 h-6 w-6" />
                    View & Download Certificate
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[1000px] w-full bg-zinc-950 border-zinc-800 p-0 overflow-hidden">
                <div className="flex flex-col items-center">

                    {/* Certificate Preview - Static Universal Image */}
                    <div className="relative w-full bg-black shrink-0">
                        <img
                            src="/certificate-universal.png"
                            alt="Certificate of Completion"
                            className="w-full h-auto block"
                            style={{
                                aspectRatio: "1.414/1",
                            }}
                        />
                    </div>

                    <div className="p-6 w-full flex justify-end gap-4 bg-zinc-900/50 border-t border-zinc-800">
                        <Button
                            onClick={handleDownload}
                            className="bg-purple-600 hover:bg-purple-700 text-white min-w-[150px]"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download Certificate
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
