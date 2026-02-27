"use client"

import { useState } from 'react'
import { CheckCircle2, Copy, ChevronDown, ChevronUp, Lightbulb, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface AnswerDisplayProps {
    detectedSubject: string
    correctedQuestion?: string
    originalQuestion: string
    quickAnswer: string
    stepByStepSolution: string
    finalAnswer: string
    relatedConcepts: string[]
    practiceQuestion?: string
    isStreaming?: boolean
}

export default function AnswerDisplay({
    detectedSubject,
    correctedQuestion,
    originalQuestion,
    quickAnswer,
    stepByStepSolution,
    finalAnswer,
    relatedConcepts,
    practiceQuestion,
    isStreaming = false
}: AnswerDisplayProps) {
    const [isStepsExpanded, setIsStepsExpanded] = useState(true)
    const [copiedSection, setCopiedSection] = useState<string | null>(null)

    // The API prompt uses LaTeX delimiters \(...\) and \[...\].
    // `react-markdown` renders math nicely via `remark-math` when using $...$ / $$...$$ delimiters.
    const normalizeLatexDelimiters = (text: string) =>
        text
            // Display math: \[ ... \] => $$ ... $$
            .replace(/\\\[/g, '$$')
            .replace(/\\\]/g, '$$')
            // Inline math: \( ... \) => $ ... $
            .replace(/\\\(/g, '$')
            .replace(/\\\)/g, '$')

    const handleCopy = (text: string, section: string) => {
        navigator.clipboard.writeText(text)
        setCopiedSection(section)
        setTimeout(() => setCopiedSection(null), 2000)
    }

    const getSubjectColor = (subject: string) => {
        const colors: Record<string, string> = {
            Mathematics: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            Physics: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
            Chemistry: 'bg-green-500/10 text-green-500 border-green-500/20',
            Biology: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            History: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            'Computer Science': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
            'General Science': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
        }
        return colors[subject] || colors['General Science']
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Subject Badge */}
            <div className="flex items-center gap-2">
                <Badge className={`${getSubjectColor(detectedSubject)} border-2 px-4 py-2 text-sm font-semibold`}>
                    {detectedSubject}
                </Badge>
            </div>

            {/* Corrected Question (if different from original) */}
            {correctedQuestion && correctedQuestion !== originalQuestion && (
                <Card className="border-2 border-amber-500/20 bg-amber-500/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">
                            Corrected Question
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{correctedQuestion}</p>
                    </CardContent>
                </Card>
            )}

            {/* Quick Answer */}
            <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Quick Answer</CardTitle>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(quickAnswer, 'quick')}
                        className="h-8"
                    >
                        <Copy className="h-4 w-4" />
                        {copiedSection === 'quick' && <span className="ml-2 text-xs">Copied!</span>}
                    </Button>
                </CardHeader>
                <CardContent>
                    {isStreaming && (
                        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span>AI is thinking...</span>
                        </div>
                    )}
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        className="prose prose-sm dark:prose-invert max-w-none"
                    >
                        {normalizeLatexDelimiters(quickAnswer)}
                    </ReactMarkdown>
                </CardContent>
            </Card>

            {/* Step-by-Step Solution */}
            {stepByStepSolution && (
                <Card className="border-2">
                    <CardHeader
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setIsStepsExpanded(!isStepsExpanded)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                <CardTitle className="text-lg">Step-by-Step Solution</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                                {isStepsExpanded && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleCopy(stepByStepSolution, 'steps')
                                        }}
                                        className="h-8"
                                    >
                                        <Copy className="h-4 w-4" />
                                        {copiedSection === 'steps' && <span className="ml-2 text-xs">Copied!</span>}
                                    </Button>
                                )}
                                {isStepsExpanded ? (
                                    <ChevronUp className="h-5 w-5" />
                                ) : (
                                    <ChevronDown className="h-5 w-5" />
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    {isStepsExpanded && (
                        <CardContent>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                className="prose prose-sm dark:prose-invert max-w-none"
                            >
                                {normalizeLatexDelimiters(stepByStepSolution)}
                            </ReactMarkdown>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Final Answer */}
            {finalAnswer && (
                <Card className="border-2 border-green-500/20 bg-green-500/5">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between">
                        <CardTitle className="text-lg text-green-600 dark:text-green-400">
                            Final Answer
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(finalAnswer, 'final')}
                            className="h-8"
                        >
                            <Copy className="h-4 w-4" />
                            {copiedSection === 'final' && <span className="ml-2 text-xs">Copied!</span>}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            className="prose prose-sm dark:prose-invert max-w-none font-semibold"
                        >
                            {normalizeLatexDelimiters(finalAnswer)}
                        </ReactMarkdown>
                    </CardContent>
                </Card>
            )}

            {/* Related Concepts */}
            {relatedConcepts.length > 0 && (
                <Card className="border-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-yellow-500" />
                            <CardTitle className="text-lg">Related Concepts</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {relatedConcepts.map((concept, index) => (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                    className="px-3 py-1 text-sm border-2"
                                >
                                    {concept}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Practice Question */}
            {practiceQuestion && (
                <Card className="border-2 border-violet-500/20 bg-violet-500/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-violet-600 dark:text-violet-400">
                            Try This Next
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{practiceQuestion}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
