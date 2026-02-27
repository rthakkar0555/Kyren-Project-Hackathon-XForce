"use client"

import { useState, useRef } from 'react'
import { Upload, Camera, Type, Loader2, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Image from 'next/image'

interface PdfDocument {
    id: string
    file_name: string
}

interface DoubtInputProps {
    onSubmit: (question: string, type: 'text' | 'image' | 'pdf', ocrText?: string, imageUrl?: string, pdfId?: string) => void
    isLoading: boolean
    pdfs?: PdfDocument[]
    onPdfUpload?: (file: File) => Promise<void>
    onPdfDelete?: (pdfId: string) => Promise<void>
}

export default function DoubtInput({ onSubmit, isLoading, pdfs = [], onPdfUpload, onPdfDelete }: DoubtInputProps) {
    const [textQuestion, setTextQuestion] = useState('')
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [ocrProgress, setOcrProgress] = useState(0)
    const [isProcessingOCR, setIsProcessingOCR] = useState(false)
    const [isUploadingPDF, setIsUploadingPDF] = useState(false)
    const [selectedPdfId, setSelectedPdfId] = useState<string>('general')
    const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const pdfInputRef = useRef<HTMLInputElement>(null)

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedImage(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedPdfFile(file)
        }
    }

    const handleRemoveImage = () => {
        setSelectedImage(null)
        setImagePreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleRemovePdf = () => {
        setSelectedPdfFile(null)
        if (pdfInputRef.current) {
            pdfInputRef.current.value = ''
        }
    }

    const handleImageSubmit = async () => {
        if (!selectedImage || !imagePreview) return

        setIsProcessingOCR(true)
        setOcrProgress(20)

        try {
            // Call server-side OCR API with Google Vision
            setOcrProgress(40)

            const response = await fetch('/api/ocr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imageData: imagePreview
                })
            })

            setOcrProgress(70)

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'OCR failed')
            }

            setOcrProgress(90)

            const extractedText = result.text?.trim() || ''

            if (!extractedText) {
                alert('No text detected in the image. Please try again with a clearer image.')
                setIsProcessingOCR(false)
                setOcrProgress(0)
                return
            }

            setOcrProgress(100)

            // Submit with OCR text
            onSubmit(extractedText, 'image', extractedText, imagePreview)

        } catch (error) {
            console.error('OCR error:', error)
            alert(error instanceof Error ? error.message : 'Failed to extract text from image. Please try again.')
        } finally {
            setIsProcessingOCR(false)
            setOcrProgress(0)
        }
    }

    const handleTextSubmit = () => {
        if (textQuestion.trim()) {
            if (selectedPdfId !== 'general') {
                onSubmit(textQuestion.trim(), 'pdf', undefined, undefined, selectedPdfId)
            } else {
                onSubmit(textQuestion.trim(), 'text')
            }
        }
    }

    const handlePdfUploadClick = async () => {
        if (!selectedPdfFile || !onPdfUpload) return

        setIsUploadingPDF(true)
        try {
            await onPdfUpload(selectedPdfFile)
            setSelectedPdfFile(null)
            if (pdfInputRef.current) {
                pdfInputRef.current.value = ''
            }
            // Switch to text tab and select the new PDF is better done by parent or effect, 
            // but we can just reset state here.
        } catch (error) {
            console.error("PDF Upload failed", error)
        } finally {
            setIsUploadingPDF(false)
        }
    }

    return (
        <div className="w-full">
            <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="text" className="flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        Type Question
                    </TabsTrigger>
                    <TabsTrigger value="image" className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Upload Image
                    </TabsTrigger>
                    <TabsTrigger value="pdf" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Upload PDF
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Context</label>
                        <Select value={selectedPdfId} onValueChange={setSelectedPdfId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Context" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="general">General Knowledge</SelectItem>
                                {pdfs && pdfs.map((pdf) => (
                                    <SelectItem key={pdf.id} value={pdf.id}>
                                        📄 {pdf.file_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Ask your question</label>
                        <Textarea
                            placeholder={selectedPdfId === 'general' ? "e.g., Solve the equation 2x + 5 = 15" : "Ask a question about this document..."}
                            value={textQuestion}
                            onChange={(e) => setTextQuestion(e.target.value)}
                            className="min-h-[120px] resize-none border-2"
                            disabled={isLoading}
                        />
                    </div>
                    <Button
                        onClick={handleTextSubmit}
                        disabled={!textQuestion.trim() || isLoading}
                        className="w-full"
                        size="lg"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Getting Answer...
                            </>
                        ) : (
                            'Get Answer'
                        )}
                    </Button>
                </TabsContent>

                <TabsContent value="image" className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Upload question image</label>

                        {!imagePreview ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                            >
                                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground mb-2">
                                    Click to upload or drag and drop
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    PNG, JPG up to 10MB
                                </p>
                            </div>
                        ) : (
                            <div className="relative border-2 border-border rounded-lg overflow-hidden">
                                <Image
                                    src={imagePreview}
                                    alt="Question preview"
                                    width={600}
                                    height={400}
                                    className="w-full h-auto"
                                />
                                <Button
                                    onClick={handleRemoveImage}
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                        />
                    </div>

                    {isProcessingOCR && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>Extracting text from image...</span>
                                <span className="font-medium">{ocrProgress}%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-primary h-full transition-all duration-300"
                                    style={{ width: `${ocrProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <Button
                        onClick={handleImageSubmit}
                        disabled={!selectedImage || isLoading || isProcessingOCR}
                        className="w-full"
                        size="lg"
                    >
                        {isProcessingOCR ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Processing Image...
                            </>
                        ) : isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Getting Answer...
                            </>
                        ) : (
                            'Extract & Answer'
                        )}
                    </Button>
                </TabsContent>

                <TabsContent value="pdf" className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Upload PDF Document</label>

                        {!selectedPdfFile ? (
                            <div
                                onClick={() => pdfInputRef.current?.click()}
                                className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                            >
                                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground mb-2">
                                    Click to upload PDF
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    PDF up to 10MB
                                </p>
                            </div>
                        ) : (
                            <div className="relative border-2 border-border rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-primary" />
                                    <div className="text-sm font-medium">{selectedPdfFile.name}</div>
                                </div>
                                <Button
                                    onClick={handleRemovePdf}
                                    variant="ghost"
                                    size="icon"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        <input
                            ref={pdfInputRef}
                            type="file"
                            accept="application/pdf"
                            onChange={handlePdfSelect}
                            className="hidden"
                        />
                    </div>

                    <Button
                        onClick={handlePdfUploadClick}
                        disabled={!selectedPdfFile || isUploadingPDF || isLoading}
                        className="w-full"
                        size="lg"
                    >
                        {isUploadingPDF ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Uploading & Processing...
                            </>
                        ) : (
                            'Upload PDF'
                        )}
                    </Button>

                    {pdfs && pdfs.length > 0 && (
                        <div className="mt-6 border-t-2 pt-4">
                            <h4 className="text-sm font-medium mb-3">Your Uploaded Documents</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {pdfs.map((pdf) => (
                                    <div key={pdf.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/20">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span className="text-sm truncate max-w-[200px]" title={pdf.file_name}>
                                                {pdf.file_name}
                                            </span>
                                        </div>
                                        {onPdfDelete && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onPdfDelete(pdf.id)}
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
