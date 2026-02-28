// Database types
export interface User {
  id: string
  email: string
  full_name?: string
  is_admin: boolean
  role: "student" | "tutor" | "teacher" | "admin"
  api_openai_key?: string
  api_gemini_key?: string
  preferred_llm: "openai" | "gemini"
  created_at: string
  updated_at: string
}

export interface TutorProfile {
  id: string
  user_id: string
  linkedin_url?: string
  github_url?: string
  website_url?: string
  bio?: string
  achievements?: string
  current_status: "available" | "busy" | "offline"
  students_guided_count: number
  rating: number
  hourly_rate?: number
  created_at: string
  updated_at: string
}

export interface PeerConnection {
  id: string
  student_id: string
  tutor_id: string
  status: "pending" | "active" | "rejected" | "ended"
  created_at: string
  updated_at: string
  student?: User
  tutor?: User
}

export interface ChatMessage {
  id: string
  connection_id: string
  sender_id: string
  recipient_id?: string
  content: string
  message_type: "text" | "image" | "file" | "system" | "call_invite" | "call_ended" | "webrtc_signal"
  is_read: boolean
  created_at: string
}

export interface TutorReview {
  id: string
  tutor_id: string
  student_id: string
  rating: number
  comment?: string
  created_at: string
  student?: User
}

export interface Course {
  id: string
  user_id: string
  title: string
  description?: string
  topic: string
  difficulty_level: "beginner" | "intermediate" | "advanced"
  course_metadata?: Record<string, any>
  learning_goals: string[]
  estimated_hours?: number
  status: "draft" | "generated" | "published"
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  course_id: string
  title: string
  description?: string
  module_order: number
  estimated_hours?: number
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  content?: string
  lesson_order: number
  learning_objectives: string[]
  key_points: string[]
  examples?: Record<string, any>
  youtube_suggestions?: Array<{ title: string; url: string }>
  practical_tasks: string[]
  estimated_minutes?: number
  created_at: string
  updated_at: string
}

export interface QuizQuestion {
  id: string
  lesson_id?: string
  course_id: string
  question_text: string
  question_type: "mcq" | "descriptive" | "code"
  options?: Record<string, any>
  correct_answer?: string
  explanation?: string
  difficulty: "easy" | "medium" | "hard"
  created_at: string
}

export interface UserProgress {
  id: string
  user_id: string
  course_id: string
  lesson_id?: string
  completed_lessons: number
  total_lessons: number
  quiz_score?: number
  last_accessed_at: string
  completed_at?: string
}

export interface GenerationRequest {
  topic: string
  difficulty: "beginner" | "intermediate" | "advanced"
  numModules: number
  lessonsPerModule: number
  includeVideos: boolean
  includeCoding: boolean
  llmProvider?: "openai" | "gemini" | "fallback"
}

export interface CourseGenerationResult {
  course: Omit<Course, "id" | "user_id" | "created_at" | "updated_at">
  modules: Array<Omit<Module, "id" | "course_id" | "created_at" | "updated_at">>
  lessons: Array<Omit<Lesson, "id" | "module_id" | "created_at" | "updated_at">>
  quizzes: Array<Omit<QuizQuestion, "id" | "created_at">>
}
