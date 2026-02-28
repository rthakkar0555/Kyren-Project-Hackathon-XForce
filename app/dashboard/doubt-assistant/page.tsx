"use client"

import { useState, useEffect } from 'react'
import { HelpCircle, Sparkles } from 'lucide-react'
import DoubtInput from '@/components/doubt-assistant/doubt-input'
import AnswerDisplay from '@/components/doubt-assistant/answer-display'
import DoubtHistory from '@/components/doubt-assistant/doubt-history'
import { toast } from 'sonner'

interface DoubtAnswer {
    detectedSubject: string
    correctedQuestion?: string
    originalQuestion: string
    quickAnswer: string
    stepByStepSolution: string
    finalAnswer: string
    relatedConcepts: string[]
    practiceQuestion?: string
}

interface PdfDocument {
    id: string
    file_name: string
    status: string
}

export default function DoubtAssistantPage() {
    const [currentAnswer, setCurrentAnswer] = useState<DoubtAnswer | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [pdfs, setPdfs] = useState<PdfDocument[]>([])

    // Diagram state
    const [currentDiagram, setCurrentDiagram] = useState<any>(null)
    const [isDiagramLoading, setIsDiagramLoading] = useState(false)

    const fetchPdfs = async () => {
        try {
            const response = await fetch('/api/pdfs')
            const result = await response.json()
            if (result.success) {
                setPdfs(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch PDFs:', error)
        }
    }

    useEffect(() => {
        fetchPdfs()
    }, [])

    const handlePdfUpload = async (file: File) => {
        const formData = new FormData()
        formData.append('file', file)

        const promise = fetch('/api/upload-pdf', {
            method: 'POST',
            body: formData
        }).then(async (res) => {
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Upload failed')
            return result
        })

        toast.promise(promise, {
            loading: 'Uploading and processing PDF...',
            success: () => {
                fetchPdfs()
                return 'PDF uploaded successfully! You can now chat with it.'
            },
            error: (err) => err.message
        })

        await promise
    }

    const handlePdfDelete = async (pdfId: string) => {
        if (!confirm('Are you sure you want to delete this PDF? This action cannot be undone.')) return

        const promise = fetch(`/api/delete-pdf?id=${pdfId}`, {
            method: 'DELETE'
        }).then(async (res) => {
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Delete failed')
            return result
        })

        toast.promise(promise, {
            loading: 'Deleting PDF...',
            success: () => {
                fetchPdfs()
                return 'PDF deleted successfully'
            },
            error: (err) => err.message
        })
    }

    const handleSubmitQuestion = async (
        question: string,
        type: 'text' | 'image' | 'pdf',
        ocrText?: string,
        imageUrl?: string,
        pdfId?: string
    ) => {
        setIsLoading(true)
        setCurrentAnswer(null)
        // Reset diagram when new question is asked
        setCurrentDiagram(null)

        try {
            const endpoint = pdfId ? '/api/chat' : '/api/doubt-assistant'
            const body = pdfId
                ? { message: question, pdfId }
                : { question, type: type === 'pdf' ? 'text' : type, ocrText, imageUrl }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.error || 'Failed to get answer')
            }

            // Handle streaming response
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let streamedContent = ''

            if (!reader) {
                throw new Error('No response body')
            }

            while (true) {
                const { done, value } = await reader.read()

                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6))

                        if (data.type === 'chunk') {
                            streamedContent += data.content
                            setCurrentAnswer({
                                detectedSubject: pdfId ? 'PDF Context' : 'Processing...',
                                originalQuestion: question,
                                quickAnswer: streamedContent,
                                stepByStepSolution: '',
                                finalAnswer: '',
                                relatedConcepts: [],
                                practiceQuestion: ''
                            })
                        } else if (data.type === 'complete') {
                            const finalAnswer: DoubtAnswer = data.data
                            setCurrentAnswer(finalAnswer)
                            setRefreshTrigger(prev => prev + 1)

                            // Auto-generate diagram for visual subjects
                            const visualSubjects = [
                                'Computer Science', 'Physics', 'Biology', 'Chemistry',
                                'Mathematics', 'General Science'
                            ]
                            const shouldAutoDiagram = visualSubjects.some(
                                s => finalAnswer.detectedSubject?.toLowerCase().includes(s.toLowerCase())
                            )
                            if (shouldAutoDiagram) {
                                // Auto-generate in background after answer streams
                                setTimeout(() => handleGenerateDiagram(finalAnswer), 300)
                            }
                        } else if (data.type === 'error') {
                            throw new Error(data.error)
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to get answer. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSelectHistoryItem = async (item: any) => {
        try {
            const response = await fetch('/api/doubt-assistant/history')
            const result = await response.json()

            if (result.success) {
                const fullItem = result.data.find((d: any) => d.id === item.id)
                if (fullItem) {
                    setCurrentAnswer({
                        detectedSubject: fullItem.detected_subject,
                        correctedQuestion: fullItem.corrected_question,
                        originalQuestion: fullItem.question_text,
                        quickAnswer: fullItem.quick_answer,
                        stepByStepSolution: fullItem.step_by_step_solution,
                        finalAnswer: fullItem.final_answer,
                        relatedConcepts: fullItem.related_concepts,
                        practiceQuestion: fullItem.practice_question
                    })
                    // Clear diagram when viewing history
                    setCurrentDiagram(null)
                }
            }
        } catch (error) {
            console.error('Failed to load doubt details:', error)
            toast.error('Failed to load doubt details')
        }
    }

    // ─── Diagram Handlers ────────────────────────────────────────────────────

    const handleGenerateDiagram = async (answerData?: DoubtAnswer) => {
        const data = answerData || currentAnswer
        if (!data) return

        setIsDiagramLoading(true)
        try {
            // Send rich context: the actual question, the full LLM answer, and the detected subject
            const fullAnswer = [
                data.quickAnswer,
                data.stepByStepSolution,
                data.finalAnswer,
            ].filter(Boolean).join('\n\n')

            const response = await fetch('/api/diagram/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: data.originalQuestion,
                    answer: fullAnswer,
                    subject: data.detectedSubject,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate diagram')
            }

            setCurrentDiagram(result.diagram)
            toast.success('Diagram generated!')
        } catch (error) {
            console.error('Diagram generation error:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to generate diagram')
        } finally {
            setIsDiagramLoading(false)
        }
    }

    const handleModifyDiagram = async (instruction: string) => {
        if (!currentDiagram) return

        setIsDiagramLoading(true)
        try {
            const response = await fetch('/api/diagram/modify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instruction, currentDiagram }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to modify diagram')
            }

            setCurrentDiagram(result.diagram)
            toast.success('Diagram updated!')
        } catch (error) {
            console.error('Diagram modify error:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to modify diagram')
        } finally {
            setIsDiagramLoading(false)
        }
    }

    const handleRegenerateLayout = async () => {
        if (!currentDiagram) return

        setIsDiagramLoading(true)
        try {
            const response = await fetch('/api/diagram/regenerate-layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentDiagram }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to regenerate layout')
            }

            setCurrentDiagram(result.diagram)
            toast.success('Layout regenerated!')
        } catch (error) {
            console.error('Layout regenerate error:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to regenerate layout')
        } finally {
            setIsDiagramLoading(false)
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-primary/10 rounded-lg border-2 border-primary/20">
                        <HelpCircle className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">AI Doubt Assistant</h1>
                        <p className="text-muted-foreground">
                            Get instant answers with step-by-step explanations and live diagrams
                        </p>
                    </div>
                </div>

                {/* Feature Pills */}
                <div className="flex flex-wrap gap-2 mt-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-sm border-2 border-blue-500/20">
                        <Sparkles className="h-3 w-3" />
                        <span>Multi-Subject Support</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-sm border-2 border-purple-500/20">
                        <Sparkles className="h-3 w-3" />
                        <span>OCR Text Extraction</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-sm border-2 border-green-500/20">
                        <Sparkles className="h-3 w-3" />
                        <span>Step-by-Step Solutions</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-sm border-2 border-indigo-500/20">
                        <Sparkles className="h-3 w-3" />
                        <span>Live Excalidraw Diagrams</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Input & Answer */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Input Section */}
                    <div className="border-2 border-border rounded-lg p-6 bg-card">
                        <DoubtInput
                            onSubmit={handleSubmitQuestion}
                            isLoading={isLoading}
                            pdfs={pdfs}
                            onPdfUpload={handlePdfUpload}
                            onPdfDelete={handlePdfDelete}
                        />
                    </div>

                    {/* Answer Section */}
                    {currentAnswer && (
                        <div className="border-2 border-border rounded-lg p-6 bg-card">
                            <AnswerDisplay
                                {...currentAnswer}
                                isStreaming={isLoading}
                                diagramData={currentDiagram}
                                isDiagramLoading={isDiagramLoading}
                                onGenerateDiagram={handleGenerateDiagram}
                                onModifyDiagram={handleModifyDiagram}
                                onRegenerateLayout={handleRegenerateLayout}
                            />
                        </div>
                    )}

                    {/* Empty State */}
                    {!currentAnswer && !isLoading && (
                        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center bg-card/50">
                            <HelpCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                            <h3 className="text-lg font-semibold mb-2">No question asked yet</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                Type your question or upload an image to get started. Our AI will provide
                                detailed step-by-step solutions and can generate interactive diagrams.
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Column - History */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6 h-[calc(100vh-8rem)]">
                        <DoubtHistory
                            onSelectDoubt={handleSelectHistoryItem}
                            refreshTrigger={refreshTrigger}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
