# 🚀 Kyren - Project Hackathon XForce

> Ready to Win 🏆

---

## 👥 Team Members

- **Rishi Thakkar**
- **Prit Patel**
- **Malay Sheta**

---

# 🎓 Kyren - Intelligent Course Generation Platform

> **Build, Learn, and Manage.** Transform any topic into a comprehensive learning experience with AI-powered course generation, real-time doubt assistance, and robust administration tools.

[![Next.js](https://img.shields.io/badge/Next.js-14.2.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-orange)](https://openai.com/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel-AI%20SDK-black)](https://sdk.vercel.ai/docs)

---

## 🚀 New Features (v2.0)

We've massively expanded Kyren's capabilities beyond simple course generation:

### 🧠 AI Doubt Assistant
- **Context-Aware Help**: Ask questions while learning; the AI understands exactly which lesson you're on.
- **Multimodal Support (OCR)**: **Upload handwritten notes or textbook images**. The system uses **GPT-4o Vision** to read and explain text from images (e.g., explaining math problems or reading "Google Cloud Platform" from handwritten notes).
- **History Tracking**: All your doubts and answers are saved for review.

### 🛡️ Admin & Content Oversight
- **Admin Dashboard**: A new comprehensive control center (`/admin`).
- **Analytics**: Track MRR, total users, course generation stats, and API usage costs in real-time.
- **Content Monitoring**: "Content Oversight" panel to review recently generated courses for policy violations.
- **User Management**: Ban/Unban users with a single click.
- **Warning System**: Send professional warning emails (with **embedded logo**) to users flagging content violations.

### 🦉 v2.1 Smart Assessment & Integrity (Completed)
- **YouTube Playlist Integration**: Convert any YouTube playlist into a structured course with a single click. Includes smart title generation.
- **Strict AI Proctoring**: Integrated webcam monitoring detects multiple faces, no faces, or tab switching. Violations trigger **immediate termination** with a permanent 0% score.
- **One-Shot Policy**: Quizzes can be attempted **exactly once**. No retakes allowed. Scores (0-100%) are locked forever.
- **Granular Progress**: Course completion is now tracked with 50/50 precision (50% for watching videos, 50% for passing quiz) for accurate "Real" progress bars.
- **Visual Feedback**: Dynamic result cards—**Green** for Pass (80%+), **Red** for Fail/Violation—replace the "Start" button post-completion.

### 🚀 v2.2 Roadmap (Coming Soon)
- **🏫 Classroom Support**: 
  - **Teacher Mode**: Create and assign courses to students.
  - **Classroom Dashboard**: New sidebar option for students to view assigned tasks.
  - **Advanced Analytics**: Teachers can track enrollments, individual progress, and quiz marks.
- **🤝 Peer-to-Peer Learning**: Collaborative tools for shared learning experiences.

### 📊 Unit Economics & Cost Tracking
- **API Usage Tracker**: Granular tracking of every token used by every user.
- **Cost Transparency**: View exact dollar amounts spent on OpenAI/Gemini per user.

---

## 💰 Unit Economics (Cost Analysis)

How much does it cost to run Kyren? Here is the breakdown based on current API pricing (Jan 2026):

| Action | Resources Used | Estimated Cost (USD) |
|--------|----------------|----------------------|
| **Generate 1 Course**<br>(4 Modules, ~12 Lessons) | **GPT-4o-mini**<br>~15k Input Tokens<br>~25k Output Tokens | **~$0.02** per course |
| **Ask 1 Text Doubt** | **GPT-4o-mini**<br>~1k Input Tokens<br>~500 Output Tokens | **~$0.0005** per doubt |
| **Ask 1 Image Doubt** | **GPT-4o (Vision)**<br>Image Processing + text | **~$0.01 - $0.02** per image |
| **Text-to-Speech** | **OpenAI TTS-1**<br>~1000 characters | **$0.015** per 1k chars |

> *Note: Costs are estimates based on average usage patterns. Real-time costs are tracked in your Admin Dashboard.*

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Admin Panel](#admin-panel)
- [Tech Stack](#tech-stack)

---

## 🌟 Overview

Kyren is an AI-powered educational platform that automatically generates complete courses from simple prompts. Unlike standard chat wrappers, Kyren creates structured learning paths with modules, interactive quizzes, curated videos, and certificated completion.

---

## ✨ Key Features

### For Learners
- 🤖 **One-Click Course Gen**: Input a topic ("Quantum Physics"), get a full curriculum.
- 📚 **Rich Content**: Markdown lessons, code blocks, and embedded YouTube videos.
- 📝 **Smart Quizzes**: Auto-generated assessments to test knowledge.
- 🎓 **Certificates**: Earn proof of completion.
- 💬 **Multimodal Tutor**: Chat with an AI that sees what you see (upload images!).

### For Admins
- 🛡️ **Moderation**: Ban users, delete content, send warnings.
- 📈 **Business Metrics**: Track Pro vs Free users, MRR, and adoption rates.
- 💸 **Cost Control**: Monitor API spend per user/feature.

---

## 🔧 How It Works

### 1. Course Generation Pipeline
1.  **Plan**: User prompt -> GPT-4o-mini -> JSON Structure (Modules/Lessons).
2.  **Content**: Parallel generation of lesson markdown content.
3.  **Enrich**: YouTube API fetches relevant videos for each lesson.
4.  **Quiz**: dedicated prompt generates questions based on lesson text.

### 2. Vision & OCR Logic
1.  **Upload**: User uploads image (base64).
2.  **Process**: File sent to `/api/ocr`.
3.  **Analyze**: **GPT-4o Vision** extracts text and context (e.g., distinguishing "Math" from "Cloud Computing").
4.  **Solve**: Extracted text + Lesson Context -> AI Tutor Answer.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase Project
- OpenAI API Key

### Installation

1. **Clone & Install**
   ```bash
   git clone <repo-url>
   cd kyren
   npm install
   ```

2. **Environment Setup**
   Create `.env.local` with your keys (see below).

3. **Run Development Server**
   ```bash
   npm run dev
   ```

---

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Critical**: For Admin functions (Bypasses RLS) |
| `OPENAI_API_KEY` | For Course Gen & Vision |
| `SMTP_HOST` / `USER` / `PASS` | For sending Warning Emails |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, Shadcn UI, Framer Motion.
- **Backend / Auth**: Supabase (PostgreSQL + Auth).
- **AI**: Vercel AI SDK, OpenAI (GPT-4o, GPT-4o-mini), Gemini (Legacy).
- **Communication**: Nodemailer (SMTP).

---

## 👨‍💼 Admin Dashboard

Access at `/admin`.
*Requires `is_admin` flag in Supabase user metadata.*

- **API Usage**: `/admin/api-usage` (Track costs).
- **Content Monitor**: `/admin` (Review & Warn).

Copyright © 2026 Kyren.
