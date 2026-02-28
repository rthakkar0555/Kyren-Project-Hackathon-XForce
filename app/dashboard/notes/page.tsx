"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Search, Pin, Edit2, Trash2, StickyNote, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Note {
    id: string
    title: string
    content: string
    category: string | null
    is_pinned: boolean
    created_at: string
    updated_at: string
}

const CATEGORIES = [
    { value: "personal", label: "Personal", color: "bg-blue-500" },
    { value: "work", label: "Work", color: "bg-purple-500" },
    { value: "ideas", label: "Ideas", color: "bg-yellow-500" },
    { value: "tasks", label: "Tasks", color: "bg-green-500" },
    { value: "learning", label: "Learning", color: "bg-pink-500" },
    { value: "other", label: "Other", color: "bg-gray-500" },
]

export default function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)
    const [currentNote, setCurrentNote] = useState<Note | null>(null)
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        category: "",
        is_pinned: false,
    })
    const { toast } = useToast()

    useEffect(() => {
        fetchNotes()
    }, [searchQuery, selectedCategory])

    const fetchNotes = async () => {
        try {
            setIsLoading(true)
            const params = new URLSearchParams()
            if (searchQuery) params.append("search", searchQuery)
            if (selectedCategory !== "all") params.append("category", selectedCategory)

            const response = await fetch(`/api/notes?${params.toString()}`)
            const data = await response.json()

            if (response.ok) {
                setNotes(data.notes || [])
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to fetch notes",
                    variant: "destructive",
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to fetch notes",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateNote = async () => {
        if (!formData.title.trim()) {
            toast({
                title: "Error",
                description: "Title is required",
                variant: "destructive",
            })
            return
        }

        try {
            const response = await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Note created successfully",
                })
                setIsCreateDialogOpen(false)
                setFormData({ title: "", content: "", category: "", is_pinned: false })
                fetchNotes()
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to create note",
                    variant: "destructive",
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to create note",
                variant: "destructive",
            })
        }
    }

    const handleUpdateNote = async () => {
        if (!currentNote || !formData.title.trim()) {
            toast({
                title: "Error",
                description: "Title is required",
                variant: "destructive",
            })
            return
        }

        try {
            const response = await fetch("/api/notes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: currentNote.id, ...formData }),
            })

            const data = await response.json()

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Note updated successfully",
                })
                setIsEditDialogOpen(false)
                setCurrentNote(null)
                setFormData({ title: "", content: "", category: "", is_pinned: false })
                fetchNotes()
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to update note",
                    variant: "destructive",
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update note",
                variant: "destructive",
            })
        }
    }

    const handleDeleteNote = async () => {
        if (!deleteNoteId) return

        try {
            const response = await fetch(`/api/notes?id=${deleteNoteId}`, {
                method: "DELETE",
            })

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Note deleted successfully",
                })
                setDeleteNoteId(null)
                fetchNotes()
            } else {
                const data = await response.json()
                toast({
                    title: "Error",
                    description: data.error || "Failed to delete note",
                    variant: "destructive",
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete note",
                variant: "destructive",
            })
        }
    }

    const handleTogglePin = async (note: Note) => {
        try {
            const response = await fetch("/api/notes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: note.id,
                    title: note.title,
                    content: note.content,
                    category: note.category,
                    is_pinned: !note.is_pinned,
                }),
            })

            if (response.ok) {
                toast({
                    title: "Success",
                    description: note.is_pinned ? "Note unpinned" : "Note pinned",
                })
                fetchNotes()
            } else {
                const data = await response.json()
                toast({
                    title: "Error",
                    description: data.error || "Failed to update note",
                    variant: "destructive",
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update note",
                variant: "destructive",
            })
        }
    }

    const openEditDialog = (note: Note) => {
        setCurrentNote(note)
        setFormData({
            title: note.title,
            content: note.content,
            category: note.category || "",
            is_pinned: note.is_pinned,
        })
        setIsEditDialogOpen(true)
    }

    const getCategoryColor = (category: string | null) => {
        if (!category) return "bg-gray-500"
        const cat = CATEGORIES.find((c) => c.value === category)
        return cat?.color || "bg-gray-500"
    }

    const getCategoryLabel = (category: string | null) => {
        if (!category) return "Uncategorized"
        const cat = CATEGORIES.find((c) => c.value === category)
        return cat?.label || category
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold tracking-tighter">Notes</h1>
                    <p className="text-muted-foreground mt-2">Create and manage your personal notes</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground border-2 border-primary font-bold">
                            <Plus className="h-5 w-5 mr-2" />
                            New Note
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="border-2 border-border max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Create New Note</DialogTitle>
                            <DialogDescription>Add a new note to your collection</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="font-bold">
                                    Title *
                                </Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Enter note title"
                                    className="border-2 border-border py-6 text-base"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="content" className="font-bold">
                                    Content
                                </Label>
                                <Textarea
                                    id="content"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Write your note here..."
                                    className="border-2 border-border min-h-[200px] text-base"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category" className="font-bold">
                                    Category
                                </Label>
                                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                    <SelectTrigger className="border-2 border-border py-6">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                                                    {cat.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_pinned"
                                    checked={formData.is_pinned}
                                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                                    className="w-5 h-5 border-2 border-border"
                                />
                                <Label htmlFor="is_pinned" className="font-bold cursor-pointer">
                                    Pin this note
                                </Label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <Button
                                onClick={handleCreateNote}
                                className="flex-1 bg-primary text-primary-foreground border-2 border-primary py-6 font-bold"
                            >
                                Create Note
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsCreateDialogOpen(false)
                                    setFormData({ title: "", content: "", category: "", is_pinned: false })
                                }}
                                variant="outline"
                                className="flex-1 border-2 border-border py-6 font-bold"
                            >
                                Cancel
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notes..."
                        className="border-2 border-border py-6 pl-12 text-base"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="border-2 border-border py-6 sm:w-[200px]">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                                    {cat.label}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Notes Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center space-y-4">
                        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                        <p className="text-muted-foreground">Loading notes...</p>
                    </div>
                </div>
            ) : notes.length === 0 ? (
                <Card className="border-2 border-border">
                    <CardContent className="py-20">
                        <div className="text-center space-y-4">
                            <StickyNote className="h-16 w-16 mx-auto text-muted-foreground" />
                            <div>
                                <h3 className="text-xl font-bold">No notes yet</h3>
                                <p className="text-muted-foreground mt-2">
                                    {searchQuery || selectedCategory !== "all"
                                        ? "No notes match your search criteria"
                                        : "Create your first note to get started"}
                                </p>
                            </div>
                            {!searchQuery && selectedCategory === "all" && (
                                <Button
                                    onClick={() => setIsCreateDialogOpen(true)}
                                    className="bg-primary text-primary-foreground border-2 border-primary font-bold"
                                >
                                    <Plus className="h-5 w-5 mr-2" />
                                    Create Note
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notes.map((note) => (
                        <Card
                            key={note.id}
                            className={`border-2 transition-all hover:shadow-lg ${note.is_pinned ? "border-primary" : "border-border"
                                }`}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-xl font-bold flex-1 break-words">{note.title}</CardTitle>
                                    <button
                                        onClick={() => handleTogglePin(note)}
                                        className={`shrink-0 transition-colors ${note.is_pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        <Pin className="h-5 w-5" fill={note.is_pinned ? "currentColor" : "none"} />
                                    </button>
                                </div>
                                {note.category && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(note.category)}`} />
                                        <span className="text-sm font-semibold">{getCategoryLabel(note.category)}</span>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-muted-foreground line-clamp-4 whitespace-pre-wrap break-words">
                                    {note.content || "No content"}
                                </p>
                                <div className="text-xs text-muted-foreground border-t-2 border-border pt-3">
                                    <p>Updated: {formatDate(note.updated_at)}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => openEditDialog(note)}
                                        variant="outline"
                                        className="flex-1 border-2 border-border font-bold"
                                    >
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                    <Button
                                        onClick={() => setDeleteNoteId(note.id)}
                                        variant="outline"
                                        className="flex-1 border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground font-bold"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="border-2 border-border max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Edit Note</DialogTitle>
                        <DialogDescription>Make changes to your note</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-title" className="font-bold">
                                Title *
                            </Label>
                            <Input
                                id="edit-title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter note title"
                                className="border-2 border-border py-6 text-base"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-content" className="font-bold">
                                Content
                            </Label>
                            <Textarea
                                id="edit-content"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder="Write your note here..."
                                className="border-2 border-border min-h-[200px] text-base"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-category" className="font-bold">
                                Category
                            </Label>
                            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                <SelectTrigger className="border-2 border-border py-6">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                                                {cat.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="edit_is_pinned"
                                checked={formData.is_pinned}
                                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                                className="w-5 h-5 border-2 border-border"
                            />
                            <Label htmlFor="edit_is_pinned" className="font-bold cursor-pointer">
                                Pin this note
                            </Label>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <Button
                            onClick={handleUpdateNote}
                            className="flex-1 bg-primary text-primary-foreground border-2 border-primary py-6 font-bold"
                        >
                            Save Changes
                        </Button>
                        <Button
                            onClick={() => {
                                setIsEditDialogOpen(false)
                                setCurrentNote(null)
                                setFormData({ title: "", content: "", category: "", is_pinned: false })
                            }}
                            variant="outline"
                            className="flex-1 border-2 border-border py-6 font-bold"
                        >
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
                <AlertDialogContent className="border-2 border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold">Delete Note?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your note.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-2 border-border font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteNote}
                            className="bg-destructive text-destructive-foreground border-2 border-destructive font-bold"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
