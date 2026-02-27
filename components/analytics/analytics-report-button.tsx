"use client"

import { Button } from "@/components/ui/button"
import { FileDown, Loader2 } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useState } from "react"
import { toast } from "sonner"

interface CourseMetric {
    id: string
    title: string
    totalLessons: number
    completedLessons: number
    progress: number
    status: string
    lastActive: string
    difficulty: string
}

interface AnalyticsStats {
    totalCourses: number
    totalModules: number
    totalLessons: number
    completedCourses: number
    completedLessons: number
    overallProgress: number
    completedHours: number
    averageQuizScore: number // -1 if N/A
    averageTrustScore: number
    violationsCount: number
    totalVideos: number
    quizCount: number
}

interface AnalyticsInsights {
    strongestTopic: string
    avgCompletionOfStarted: number
    totalCertificates: number
}

interface AnalyticsReportButtonProps {
    userName: string
    stats: AnalyticsStats
    courses: CourseMetric[]
    insights: AnalyticsInsights
}

export function AnalyticsReportButton({ userName, stats, courses, insights }: AnalyticsReportButtonProps) {
    const [generating, setGenerating] = useState(false)

    const generatePDF = () => {
        setGenerating(true)
        try {
            const doc = new jsPDF()
            const pageWidth = doc.internal.pageSize.width
            const margin = 15
            const contentWidth = pageWidth - (margin * 2)

            // --- 1. Branding Header ---
            doc.setFillColor(220, 38, 38) // Red-600
            doc.rect(0, 0, pageWidth, 40, 'F')

            doc.setFontSize(22)
            doc.setTextColor(255, 255, 255)
            doc.setFont("helvetica", "bold")
            doc.text("Kyren — Learn Beyond Expectations", margin, 20)

            doc.setFontSize(10)
            doc.setTextColor(255, 255, 255)
            doc.setFont("helvetica", "normal")
            const dateStr = new Date().toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })
            doc.text(`Strategic Learning Report • Prepared for ${userName}`, margin, 32)

            let currentY = 55

            // --- 2. Personalized Executive Summary ---
            doc.setFontSize(14)
            doc.setTextColor(0, 0, 0)
            doc.setFont("helvetica", "bold")
            doc.text("Executive Summary", margin, currentY)
            currentY += 8

            // Logic for personalized text
            let summaryText = `You have completed ${stats.completedCourses} out of ${stats.totalCourses} active courses (${Math.round((stats.completedCourses / stats.totalCourses) * 100) || 0}% Completion Rate). `

            if (courses.length > 0) {
                const inProgress = courses.filter(c => c.progress > 0 && c.progress < 100).length
                if (inProgress > 2) {
                    summaryText += `You currently have ${inProgress} courses in progress. Narrowing your focus to finish one at a time will boost your momentum. `
                } else {
                    summaryText += `Your focus is good. Maintaining this pace will help you reach your certificates faster. `
                }
            }

            if (stats.averageQuizScore === -1) {
                summaryText += "You haven't attempted any quizzes yet. Taking your first quiz is the best way to validate your knowledge. "
            } else if (stats.averageQuizScore > 85) {
                summaryText += `Your knowledge retention is excellent with a ${stats.averageQuizScore}% average. You are ready for more advanced topics. `
            } else {
                summaryText += `Your average quiz score is ${stats.averageQuizScore}%. We recommend reviewing key concepts before your next attempt. `
            }

            summaryText += `Your strongest engagement is in "${insights.strongestTopic}".`

            doc.setFontSize(10)
            doc.setTextColor(60, 60, 60)
            doc.setFont("helvetica", "normal")
            const splitSummary = doc.splitTextToSize(summaryText, contentWidth)
            doc.text(splitSummary, margin, currentY)
            currentY += (splitSummary.length * 5) + 15

            // --- 3. Performance Metrics Grid ---
            doc.setFontSize(14)
            doc.setTextColor(0, 0, 0)
            doc.setFont("helvetica", "bold")
            doc.text("Performance Overview", margin, currentY)
            currentY += 10

            const drawStatBox = (x: number, y: number, w: number, h: number, label: string, value: string, subtext: string, accentColor: [number, number, number]) => {
                doc.setDrawColor(230, 230, 230)
                doc.setFillColor(252, 252, 252)
                doc.roundedRect(x, y, w, h, 2, 2, 'FD')
                doc.setFillColor(...accentColor)
                doc.rect(x, y, 1.5, h, 'F')
                doc.setFontSize(16)
                doc.setTextColor(0, 0, 0)
                doc.setFont("helvetica", "bold")
                doc.text(value, x + 5, y + 14)
                doc.setFontSize(9)
                doc.setTextColor(80, 80, 80)
                doc.setFont("helvetica", "bold")
                doc.text(label, x + 5, y + 22)
                doc.setFontSize(7)
                doc.setTextColor(120, 120, 120)
                doc.setFont("helvetica", "normal")
                doc.text(subtext, x + 5, y + 28)
            }

            const gap = 4
            const boxWidth = (contentWidth - (gap * 3)) / 4
            const boxHeight = 35

            drawStatBox(margin, currentY, boxWidth, boxHeight, "Learning Time", `${stats.completedHours}h`, "Total active hours", [59, 130, 246])
            drawStatBox(margin + boxWidth + gap, currentY, boxWidth, boxHeight, "Avg Velocity", `${Math.round(stats.totalLessons / (stats.totalCourses || 1))} lessons`, "Per course avg", [16, 185, 129])
            drawStatBox(margin + (boxWidth + gap) * 2, currentY, boxWidth, boxHeight, "Quiz Avg", stats.averageQuizScore === -1 ? "N/A" : `${stats.averageQuizScore}%`, "Knowledge check", [245, 158, 11])
            drawStatBox(margin + (boxWidth + gap) * 3, currentY, boxWidth, boxHeight, "Exam Trust", `${stats.averageTrustScore}%`, "Proctoring score", [239, 68, 68])

            currentY += boxHeight + 20

            // --- 4. Learning Insights & Certificate Progress ---
            // Two columns: Left (Insights), Right (Certificates)

            // Left Col: Insights
            doc.setFontSize(14)
            doc.setTextColor(0, 0, 0)
            doc.setFont("helvetica", "bold")
            doc.text("Learning Insights", margin, currentY)

            doc.setFontSize(10)
            doc.setTextColor(60, 60, 60)
            doc.setFont("helvetica", "normal")

            let insightY = currentY + 10

            const insightsList = [
                `Strongest Topic: ${insights.strongestTopic}`,
                `Course Drop-off: Avg. ${100 - insights.avgCompletionOfStarted}% remaining`,
                `Quiz Attempts: ${stats.quizCount > 0 ? stats.quizCount : 'None yet'}`,
                `Learning Style: ${stats.completedHours < 5 ? 'Sprinter (Short Sessions)' : 'Deep Diver (Long Sessions)'}`
            ]

            insightsList.forEach(item => {
                doc.text(`• ${item}`, margin, insightY)
                insightY += 7
            })

            // Right Col: Certificates (Motivational)
            const rightColX = pageWidth / 2 + 10
            doc.setFontSize(14)
            doc.setTextColor(0, 0, 0)
            doc.setFont("helvetica", "bold")
            doc.text("Certificate Tracker", rightColX, currentY)

            doc.setFontSize(10)
            doc.setTextColor(60, 60, 60)
            doc.setFont("helvetica", "normal")

            let certY = currentY + 10
            doc.text(`• Earned: ${insights.totalCertificates}`, rightColX, certY)
            certY += 7

            // Find closest course
            const closest = courses
                .filter(c => c.progress < 100)
                .sort((a, b) => b.progress - a.progress)[0]

            if (closest) {
                doc.text(`• Closest Goal: ${closest.title.substring(0, 20)}${closest.title.length > 20 ? '...' : ''}`, rightColX, certY)
                certY += 7
                doc.text(`• Needs: ${closest.totalLessons - closest.completedLessons} lessons to unlock`, rightColX, certY)
            } else {
                doc.text("• All active courses completed!", rightColX, certY)
            }

            currentY = Math.max(insightY, certY) + 15

            // --- 5. Actionable Recommendations (NEW) ---
            doc.setFontSize(14)
            doc.setTextColor(0, 0, 0)
            doc.setFont("helvetica", "bold")
            doc.text("Recommended Actions", margin, currentY)
            currentY += 8

            const actions = []
            if (closest && closest.progress > 70) {
                actions.push(`Quick Win: Update finish '${closest.title}' (only ${closest.totalLessons - closest.completedLessons} lessons left) to earn your next certificate.`)
            }
            if (stats.averageQuizScore === -1) {
                actions.push(`Validation: You haven't taken a quiz yet. Complete a quiz to establish your baseline score.`)
            }
            if (stats.violationsCount > 1) {
                actions.push(`Integrity: Your Trust Score is impacted. Avoid tab switching in your next quiz to improve it.`)
            }
            if (actions.length === 0) {
                actions.push(`Keep going: Start a new advanced course to challenge your skills.`)
            }

            doc.setFontSize(10)
            doc.setTextColor(0, 100, 0) // Dark Green for positive action
            actions.forEach(action => {
                const splitAction = doc.splitTextToSize(`• ${action}`, contentWidth)
                doc.text(splitAction, margin, currentY)
                currentY += (splitAction.length * 5) + 3
            })

            currentY += 10

            // --- 6. Detailed Course Progress Table with Visual Bars ---
            const tableBody = courses.map(c => [
                c.title,
                `${c.progress}`, // Only the number, bar drawn manually
                c.status,
                c.difficulty
            ])

            autoTable(doc, {
                startY: currentY,
                head: [['Course Name', 'Progress', 'Status', 'Level']],
                body: tableBody,
                theme: 'grid',
                headStyles: {
                    fillColor: [245, 245, 245],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    lineWidth: 0.1,
                    lineColor: [200, 200, 200]
                },
                columnStyles: {
                    0: { cellWidth: 80 }, // Title
                    1: { cellWidth: 40, halign: 'center' }, // Progress Bar Column
                },
                styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
                margin: { left: margin, right: margin },
                didDrawCell: (data) => {
                    if (data.section === 'body' && data.column.index === 1) {
                        const cell = data.cell
                        const progress = parseFloat(data.cell.raw as string)

                        // Draw Background Bar
                        const barHeight = 4
                        const barWidth = 25
                        const x = cell.x + 10 // centerish
                        const y = cell.y + (cell.height / 2) - (barHeight / 2)

                        doc.setFillColor(230, 230, 230)
                        doc.roundedRect(x, y, barWidth, barHeight, 1, 1, 'F')

                        // Draw Progress Bar
                        if (progress > 0) {
                            doc.setFillColor(16, 185, 129) // Green
                            doc.roundedRect(x, y, (progress / 100) * barWidth, barHeight, 1, 1, 'F')
                        }

                        // Draw Text
                        doc.setFontSize(7)
                        doc.setTextColor(0, 0, 0)
                        // doc.text(`${progress}%`, x + barWidth + 2, y + 3) // Text next to bar
                    }
                }
            })

            // Footer
            const pageCount = doc.getNumberOfPages()
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i)
                doc.setFontSize(8)
                doc.setTextColor(150, 150, 150)
                doc.text("Kyren AI Learning Platform - Generated Report", margin, doc.internal.pageSize.height - 10)
                doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - margin - 20, doc.internal.pageSize.height - 10)
            }

            doc.save(`Kyren_Pro_Report_${new Date().toISOString().split('T')[0]}.pdf`)
            toast.success("Pro Report downloaded successfully")

        } catch (error) {
            console.error("PDF generation failed:", error)
            toast.error("Failed to generate report")
        } finally {
            setGenerating(false)
        }
    }

    return (
        <Button
            onClick={generatePDF}
            variant="outline"
            disabled={generating}
            className="gap-2"
        >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Download Pro Report
        </Button>
    )
}
