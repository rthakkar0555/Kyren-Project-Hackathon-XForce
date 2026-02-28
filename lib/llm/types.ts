export interface ModelConfig {
  provider: "openai" | "gemini"
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface CourseOutline {
  courseTitle: string
  courseDescription: string
  learningGoals: string[]
  difficulty: string
  estimatedHours: number
  modules: ModuleOutline[]
}

export interface ModuleOutline {
  title: string
  description: string
  estimatedHours: number
  lessons: LessonOutline[]
}

export interface LessonOutline {
  title: string
  objectives: string[]
  keyPoints: string[]
  content: string
  youtubeTopics: string[]
  practicalTasks: string[]
  estimatedMinutes: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}
