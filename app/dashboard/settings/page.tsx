"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SettingsPage() {
  const [fullName, setFullName] = useState("")
  const [preferredLLM, setPreferredLLM] = useState("openai")
  const [openaiKey, setOpenaiKey] = useState("")
  const [geminiKey, setGeminiKey] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage("")

    try {
      const response = await fetch("/api/auth/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          preferred_llm: preferredLLM,
          api_openai_key: openaiKey || undefined,
          api_gemini_key: geminiKey || undefined,
        }),
      })

      if (!response.ok) throw new Error("Failed to save settings")

      setSaveMessage("Settings saved successfully!")
      setTimeout(() => setSaveMessage(""), 3000)
    } catch (error) {
      setSaveMessage("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tighter">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your profile and preferences</p>
      </div>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-bold">
              Full Name
            </Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="border-2 border-border py-6 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="llm" className="font-bold">
              Preferred LLM
            </Label>
            <Select value={preferredLLM} onValueChange={setPreferredLLM}>
              <SelectTrigger className="border-2 border-border py-6">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="openai-key" className="font-bold">
              OpenAI API Key (Optional)
            </Label>
            <Input
              id="openai-key"
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="border-2 border-border py-6 text-base"
            />
            <p className="text-sm text-muted-foreground">Leave blank to use default API</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gemini-key" className="font-bold">
              Gemini API Key (Optional)
            </Label>
            <Input
              id="gemini-key"
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Your Gemini key..."
              className="border-2 border-border py-6 text-base"
            />
            <p className="text-sm text-muted-foreground">Leave blank to use default API</p>
          </div>
        </CardContent>
      </Card>

      {saveMessage && (
        <div
          className={`p-4 border-2 ${saveMessage.includes("success") ? "border-green-500 bg-green-100 text-green-900" : "border-red-500 bg-red-100 text-red-900"}`}
        >
          {saveMessage}
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-primary text-primary-foreground border-2 border-primary py-6 text-base font-bold"
      >
        {isSaving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  )
}
