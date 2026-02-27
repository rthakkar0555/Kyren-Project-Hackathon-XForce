"use client"

import { useState, useEffect } from 'react'
import { History, Trash2, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { formatDistanceToNow } from 'date-fns'

interface DoubtHistoryItem {
    id: string
    question_text: string
    detected_subject: string
    quick_answer: string
    created_at: string
}

interface DoubtHistoryProps {
    onSelectDoubt: (doubt: DoubtHistoryItem) => void
    refreshTrigger?: number
}

export default function DoubtHistory({ onSelectDoubt, refreshTrigger }: DoubtHistoryProps) {
    const [history, setHistory] = useState<DoubtHistoryItem[]>([])
    const [filteredHistory, setFilteredHistory] = useState<DoubtHistoryItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [subjectFilter, setSubjectFilter] = useState('all')

    const fetchHistory = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/doubt-assistant/history')
            const result = await response.json()

            if (result.success) {
                setHistory(result.data)
                setFilteredHistory(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch history:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [refreshTrigger])

    useEffect(() => {
        let filtered = history

        // Filter by subject
        if (subjectFilter !== 'all') {
            filtered = filtered.filter(item => item.detected_subject === subjectFilter)
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(item =>
                item.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.quick_answer.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        setFilteredHistory(filtered)
    }, [searchQuery, subjectFilter, history])

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()

        if (!confirm('Are you sure you want to delete this doubt?')) return

        try {
            const response = await fetch(`/api/doubt-assistant/history?id=${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                setHistory(prev => prev.filter(item => item.id !== id))
            }
        } catch (error) {
            console.error('Failed to delete:', error)
        }
    }

    const getSubjectColor = (subject: string) => {
        const colors: Record<string, string> = {
            Mathematics: 'bg-blue-500/10 text-blue-500',
            Physics: 'bg-purple-500/10 text-purple-500',
            Chemistry: 'bg-green-500/10 text-green-500',
            Biology: 'bg-emerald-500/10 text-emerald-500',
            History: 'bg-amber-500/10 text-amber-500',
            'Computer Science': 'bg-indigo-500/10 text-indigo-500',
            'General Science': 'bg-cyan-500/10 text-cyan-500'
        }
        return colors[subject] || colors['General Science']
    }

    const subjects = ['all', ...Array.from(new Set(history.map(item => item.detected_subject)))]

    return (
        <div className="h-full max-h-full flex flex-col border-2 border-border rounded-lg bg-card overflow-hidden">
            <div className="p-4 border-b-2 border-border space-y-3">
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    <h3 className="font-semibold">Doubt History</h3>
                </div>

                <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search doubts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 border-2"
                        />
                    </div>

                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                        <SelectTrigger className="border-2">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                <SelectValue placeholder="Filter by subject" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {subjects.map(subject => (
                                <SelectItem key={subject} value={subject}>
                                    {subject === 'all' ? 'All Subjects' : subject}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>


            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        Loading history...
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        {searchQuery || subjectFilter !== 'all'
                            ? 'No doubts found matching your filters'
                            : 'No doubt history yet. Ask your first question!'}
                    </div>
                ) : (
                    <div className="p-2 space-y-2">
                        {filteredHistory.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => onSelectDoubt(item)}
                                className="p-3 border-2 border-border rounded-lg hover:border-primary cursor-pointer transition-all group"
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <Badge className={`${getSubjectColor(item.detected_subject)} text-xs`}>
                                        {item.detected_subject}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => handleDelete(item.id, e)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>

                                <p className="text-sm font-medium line-clamp-2 mb-1">
                                    {item.question_text}
                                </p>

                                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                    {item.quick_answer}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
