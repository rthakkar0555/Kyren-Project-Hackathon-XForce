"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "ai/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { MessageCircle, X, Send, Sparkles, User, Bot } from "lucide-react"
import { cn } from "@/lib/utils"

interface LessonChatAssistantProps {
    lessonTitle: string
    lessonContext: {
        title: string
        objectives?: string[]
        keyPoints?: string[]
        content?: string
    }
}

export default function LessonChatAssistant({ lessonTitle, lessonContext }: LessonChatAssistantProps) {
    const [isOpen, setIsOpen] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    const { messages, input, handleInputChange, handleSubmit, isLoading, append, setMessages } = useChat({
        api: "/api/chat/lesson",
        body: {
            lessonContext,
        },
        onError: (error) => {
            // Add a temporary system message to show the error
            const errorMessage = error.message || "Something went wrong. Please try again."

            // We use a timeout to ensure this runs after the current render cycle if needed, 
            // though directly appending works in most cases. 
            // However, useChat doesn't give us a direct way to inject a "system" error message easily 
            // without messing up the history, so we'll just toast it or append a fake bot message.
            // Appending a fake bot message is better for UX here.

            // Note: Since we can't easily append from here without triggering another request in some versions,
            // we will manually update the messages state if possible, or just let the user see the toast.
            // But waiting for the 'setMessages' from useChat is cleaner.
            // @ts-ignore
            setMessages((previousMessages: any) => [
                ...previousMessages,
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: errorMessage.includes("overwhelmed")
                        ? "I'm a bit overwhelmed! 😅 Please give me a minute."
                        : "I encountered an error. Please try again."
                }
            ])
        }
    })

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleExplainLike5 = () => {
        append({
            role: "user",
            content: "Explain this lesson to me like I'm 5 years old.",
        })
    }

    const [showNudge, setShowNudge] = useState(false)

    // Periodic Nudge for onboarding
    useEffect(() => {
        if (isOpen) {
            setShowNudge(false)
            return
        }

        const interval = setInterval(() => {
            setShowNudge(true)
            // Hide after 5 seconds
            setTimeout(() => setShowNudge(false), 5000)
        }, 20000) // Every 20 seconds

        return () => clearInterval(interval)
    }, [isOpen])

    return (
        <>
            {/* Nudge Tooltip */}
            <div
                className={cn(
                    "fixed bottom-24 right-8 z-50 transition-all duration-300 pointer-events-none origin-bottom-right",
                    showNudge && !isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
                )}
            >
                <div className="bg-white border-2 border-black px-4 py-2 rounded-xl rounded-br-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
                    <span className="font-bold text-sm">Stuck? I can explain this! 👇</span>
                </div>
            </div>

            {/* Floating Toggle Button */}
            <Button
                onClick={() => {
                    setIsOpen(!isOpen)
                    setShowNudge(false)
                }}
                className={cn(
                    "fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 transition-all duration-300 border-2 border-black",
                    isOpen ? "bg-red-500 hover:bg-red-600 rotate-90" : "bg-white hover:bg-gray-50 text-black animate-in zoom-in duration-300"
                )}
            >
                {isOpen ? <X className="h-6 w-6 text-white" /> : <Sparkles className="h-6 w-6 text-black" />}
            </Button>

            {/* Chat Window */}
            <div
                className={cn(
                    "fixed bottom-24 right-8 w-[380px] max-w-[calc(100vw-40px)] z-40 transition-all duration-300 origin-bottom-right",
                    isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-10 pointer-events-none"
                )}
            >
                <Card className="border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-[600px] flex flex-col overflow-hidden bg-white">
                    {/* Header */}
                    <CardHeader className="p-4 border-b-2 border-black bg-white flex flex-row items-center justify-between space-y-0 text-left">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 border-2 border-black rounded-full bg-yellow-300 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <Sparkles className="h-5 w-5 text-black" />
                            </div>
                            <div>
                                <h3 className="font-black text-lg">Study Companion</h3>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px] font-medium">{lessonTitle}</p>
                            </div>
                        </div>
                    </CardHeader>

                    {/* Content */}
                    <CardContent className="flex-1 p-0 overflow-hidden relative bg-slate-50">
                        <ScrollArea className="h-full p-4" ref={scrollRef}>
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 opacity-90">
                                    <div className="relative">
                                        <div className="h-20 w-20 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 relative">
                                            <Sparkles className="h-10 w-10 text-yellow-500" />
                                        </div>
                                        <div className="absolute -right-2 -top-2">
                                            <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 border-2 border-black rounded-full">
                                                ONLINE
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-bold text-xl">How can I help?</h4>
                                        <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
                                            I've analyzed <strong>"{lessonTitle}"</strong> and I'm ready to answer your questions!
                                        </p>
                                    </div>

                                    <Button
                                        onClick={handleExplainLike5}
                                        variant="outline"
                                        className="bg-white border-2 border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-bold"
                                    >
                                        👶 Explain like I'm 5
                                    </Button>
                                </div>
                            )}

                            <div className="space-y-6 pb-4">
                                {messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}
                                    >
                                        <div
                                            className={cn(
                                                "flex gap-3 max-w-[85%]",
                                                m.role === "user" ? "flex-row-reverse" : "flex-row"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "h-8 w-8 rounded-full border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                                    m.role === "user" ? "bg-black text-white" : "bg-yellow-300 text-black"
                                                )}
                                            >
                                                {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                                            </div>

                                            <div
                                                className={cn(
                                                    "p-4 rounded-xl text-sm border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                                                    m.role === "user"
                                                        ? "bg-white text-black rounded-tr-none"
                                                        : "bg-white text-black rounded-tl-none"
                                                )}
                                            >
                                                <div className="leading-relaxed">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:p-2 prose-pre:rounded-lg"
                                                        components={{
                                                            ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2">{props.children}</ul>,
                                                            ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2">{props.children}</ol>,
                                                            li: ({ node, ...props }) => <li className="mb-1">{props.children}</li>,
                                                            strong: ({ node, ...props }) => <span className="font-bold text-black">{props.children}</span>,
                                                        }}
                                                    >
                                                        {m.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="flex gap-3">
                                            <div className="h-8 w-8 rounded-full border-2 border-black flex items-center justify-center bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                <Sparkles className="h-4 w-4 text-black" />
                                            </div>
                                            <div className="bg-white p-4 rounded-xl rounded-tl-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5">
                                                <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-2 h-2 bg-black rounded-full animate-bounce"></span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>

                    {/* Footer */}
                    <CardFooter className="p-4 border-t-2 border-black bg-white">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleSubmit(e)
                            }}
                            className="flex w-full gap-3"
                        >
                            <Input
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Type your question..."
                                className="flex-1 border-2 border-black focus-visible:ring-0 focus-visible:border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-slate-50"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={isLoading}
                                className="shrink-0 bg-black text-white hover:bg-black/90 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all h-10 w-10"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            </div>
        </>
    )
}
