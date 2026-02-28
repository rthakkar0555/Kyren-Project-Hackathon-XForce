import { generateText } from "ai"
import { getLLMModel } from "./client"
import {
  COURSE_VALIDATION_PROMPT,
  COURSE_OUTLINE_PROMPT,
  LESSON_EXPANSION_PROMPT,
  QUIZ_GENERATION_PROMPT,
  YOUTUBE_SUGGESTION_PROMPT,
} from "./prompts"
import type { CourseOutline, ValidationResult } from "./types"
import { logAPIUsage } from "@/lib/api-usage-tracker"

const MAX_RETRIES = 3
const RETRY_DELAY = 1000

async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY,
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries <= 0) throw error
    await new Promise((resolve) => setTimeout(resolve, delay))
    return retryWithExponentialBackoff(fn, retries - 1, delay * 2)
  }
}

function validateJSON(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    // 1. Try to extract JSON from response (object or array)
    // Look for outermost brackets
    const firstOpenBrace = text.indexOf('{');
    const firstOpenBracket = text.indexOf('[');

    let startIndex = -1;
    let endIndex = -1;

    // Determine if we should look for object or array first (whichever comes first)
    if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
      startIndex = firstOpenBrace;
      endIndex = text.lastIndexOf('}') + 1;
    } else if (firstOpenBracket !== -1) {
      startIndex = firstOpenBracket;
      endIndex = text.lastIndexOf(']') + 1;
    }

    if (startIndex !== -1 && endIndex > startIndex) {
      try {
        const jsonStr = text.substring(startIndex, endIndex);
        return JSON.parse(jsonStr)
      } catch {
        // Continue
      }
    }

    // 2. Fallback: Cleanup common markdown code blocks
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim()

    // 3. Fallback: Cleanup possible leading text like "Here is the JSON:"
    if (!cleanText.startsWith('{') && !cleanText.startsWith('[')) {
      const brace = cleanText.indexOf('{')
      const bracket = cleanText.indexOf('[')
      if (brace !== -1 && (bracket === -1 || brace < bracket)) cleanText = cleanText.substring(brace)
      else if (bracket !== -1) cleanText = cleanText.substring(bracket)
    }

    // 4. Fallback: Cleanup trailing text
    const lastBrace = cleanText.lastIndexOf('}')
    const lastBracket = cleanText.lastIndexOf(']')
    if (lastBrace !== -1 && (lastBracket === -1 || lastBrace > lastBracket)) cleanText = cleanText.substring(0, lastBrace + 1)
    else if (lastBracket !== -1) cleanText = cleanText.substring(0, lastBracket + 1)

    try {
      return JSON.parse(cleanText)
    } catch (e) {
      console.error("Failed to parse JSON:", text.substring(0, 100) + "...")
      throw new Error("Invalid JSON response from LLM")
    }
  }
}

export async function validateCourseTopic(
  topic: string,
  provider: "openai" | "gemini" = "openai",
): Promise<ValidationResult> {
  const model = getLLMModel({ provider }) as any

  const prompt = COURSE_VALIDATION_PROMPT.replace("{topic}", topic)

  const { text } = await retryWithExponentialBackoff(() =>
    generateText({
      model,
      prompt,
      temperature: 0.3, // Low temperature for consistency
      maxTokens: 500,
    }),
  )

  const result = validateJSON(text)

  return {
    isValid: (result as any).isValid !== false,
    errors: (result as any).errors || [],
    warnings: (result as any).warnings || [],
  }
}

export async function generateCourseOutline(
  topic: string,
  difficulty: "beginner" | "intermediate" | "advanced",
  numModules: number,
  lessonsPerModule: number,
  provider: "openai" | "gemini" = "openai",
  userId?: string,
): Promise<CourseOutline> {
  const model = getLLMModel({ provider })

  const prompt = COURSE_OUTLINE_PROMPT.replace("{topic}", topic)
    .replace("{difficulty}", difficulty)
    .replace("{numModules}", numModules.toString())
    .replace("{lessonsPerModule}", lessonsPerModule.toString())

  const response = await retryWithExponentialBackoff(() =>
    generateText({
      model,
      prompt,
      temperature: 0.7,
      maxTokens: 8000,
    }),
  )

  const { text, usage } = response

  // Log API usage
  if (userId && usage) {
    try {
      await logAPIUsage({
        userId,
        serviceName: provider === "openai" ? "openai_gpt" : "gemini",
        endpoint: "/api/courses/generate",
        modelName: provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash",
        inputTokens: usage.promptTokens || 0,
        outputTokens: usage.completionTokens || 0,
      })
    } catch (error) {
      console.error("[Generator] Failed to log course outline usage:", error)
    }
  }

  const result = validateJSON(text)

  // Validate result structure & Normalize keys (handle Case formatting from LLM)
  const normalizedResult: any = { ...result }

  // Handle "Modules" vs "modules"
  if (normalizedResult.Modules && !normalizedResult.modules) {
    normalizedResult.modules = normalizedResult.Modules
  }

  // Handle "CourseTitle" vs "courseTitle"
  if (normalizedResult.CourseTitle && !normalizedResult.courseTitle) {
    normalizedResult.courseTitle = normalizedResult.CourseTitle
  }

  if (!normalizedResult.modules || !Array.isArray(normalizedResult.modules)) {
    console.error("Invalid Structure Received:", JSON.stringify(normalizedResult, null, 2))
    throw new Error("Invalid course outline structure: 'modules' array is missing.")
  }

  // Deep normalization: Ensure every module has 'lessons'
  normalizedResult.modules = normalizedResult.modules.map((mod: any) => {
    // Handle 'Lessons' vs 'lessons'
    if (mod.Lessons && !mod.lessons) {
      mod.lessons = mod.Lessons
    }

    // Ensure lessons is an array
    if (!mod.lessons || !Array.isArray(mod.lessons) || mod.lessons.length === 0) {
      console.warn(`[Generator] Module "${mod.title}" has 0 lessons. Injecting default lessons to prevent failure.`)
      mod.lessons = [
        {
          title: `Introduction to ${mod.title}`,
          objectives: ["Understand the core concepts", "Identify key terminology"],
          keyPoints: ["Overview", "Importance", "Basic definitions"],
          content: `Introduction and overview of ${mod.title}.`,
          youtubeTopics: [mod.title, "Crash Course"],
          practicalTasks: ["Review the definitions"],
          estimatedMinutes: 15
        },
        {
          title: `Core Concepts of ${mod.title}`,
          objectives: ["Deep dive into main topics"],
          keyPoints: ["Detailed analysis", "Examples"],
          content: `Detailed exploration of ${mod.title}.`,
          youtubeTopics: [mod.title, "Tutorial"],
          practicalTasks: ["Write a summary"],
          estimatedMinutes: 30
        },
        {
          title: `Applying ${mod.title}`,
          objectives: ["Practical application", "Real-world use cases"],
          keyPoints: ["Case studies", "Implementation"],
          content: `Practical application of ${mod.title}.`,
          youtubeTopics: [mod.title, "Example"],
          practicalTasks: ["Complete the quiz"],
          estimatedMinutes: 20
        }
      ]
    }

    return mod
  })

  // Final sanity check
  const totalLessons = normalizedResult.modules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0)
  if (totalLessons === 0) {
    throw new Error("Critical Failure: Course has 0 lessons even after fallback injection.")
  }

  return normalizedResult as CourseOutline
}

export async function expandLesson(
  lessonTitle: string,
  lessonContext: string,
  provider: "openai" | "gemini" = "openai",
  userId?: string,
): Promise<string> {
  const model = getLLMModel({ provider })

  const prompt = LESSON_EXPANSION_PROMPT.replace("{lessonTitle}", lessonTitle).replace("{lessonContext}", lessonContext)

  const response = await retryWithExponentialBackoff(() =>
    generateText({
      model,
      prompt,
      temperature: 0.7,
      maxTokens: 4000,
    }),
  )

  const { text, usage } = response

  // Log API usage
  if (userId && usage) {
    try {
      await logAPIUsage({
        userId,
        serviceName: provider === "openai" ? "openai_gpt" : "gemini",
        endpoint: "/api/courses/generate",
        modelName: provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash",
        inputTokens: usage.promptTokens || 0,
        outputTokens: usage.completionTokens || 0,
      })
    } catch (error) {
      console.error("[Generator] Failed to log lesson expansion usage:", error)
    }
  }

  return text
}

export async function generateQuizQuestions(
  lessonTitle: string,
  lessonContent: string,
  courseDifficulty: "beginner" | "intermediate" | "advanced",
  provider: "openai" | "gemini" = "openai",
  userId?: string,
): Promise<any[]> {
  console.log(`[Generator] Starting quiz generation for: "${lessonTitle}" using ${provider}`)

  const model = getLLMModel({ provider }) as any

  const prompt = QUIZ_GENERATION_PROMPT.replace("{lessonTitle}", lessonTitle).replace(
    "{lessonContent}",
    lessonContent.substring(0, 2000), // Limit context to avoid token overflow
  ).replace(/{courseDifficulty}/g, courseDifficulty)

  let lastError: any;

  // Try LLM generation with retries
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[Generator] Quiz generation attempt ${attempt}/3 for "${lessonTitle}"`)

      const response = await generateText({
        model,
        prompt,
        temperature: 0.5,
        maxTokens: 2000,
      })

      const { text, usage } = response

      // Log API usage
      if (userId && usage) {
        try {
          await logAPIUsage({
            userId,
            serviceName: provider === "openai" ? "openai_gpt" : "gemini",
            endpoint: "/api/courses/generate",
            modelName: provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash",
            inputTokens: usage.promptTokens || 0,
            outputTokens: usage.completionTokens || 0,
          })
        } catch (logError) {
          console.warn("[Generator] Failed to log API usage:", logError)
        }
      }

      const result = validateJSON(text)

      // Handle different response formats
      let questions: any[] = [];

      if (Array.isArray(result)) {
        questions = result;
      } else if (result.questions && Array.isArray(result.questions)) {
        questions = result.questions;
      } else if (result.quiz && Array.isArray(result.quiz)) {
        questions = result.quiz;
      } else {
        throw new Error(`Quiz generation returned unexpected format: ${typeof result}`)
      }

      // Validate questions have required fields
      const validQuestions = questions.filter(q =>
        q.question_text || q.question
      );

      if (validQuestions.length > 0) {
        console.log(`[Generator] ✓ Successfully generated ${validQuestions.length} quiz questions for "${lessonTitle}"`)
        return validQuestions;
      } else {
        throw new Error("Generated questions are missing required fields")
      }

    } catch (error) {
      console.error(`[Generator] Quiz generation attempt ${attempt}/3 failed for "${lessonTitle}":`, error)
      lastError = error;

      if (attempt < 3) {
        const delay = 1000 * attempt;
        console.log(`[Generator] Retrying in ${delay}ms...`)
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // All LLM attempts failed - generate fallback questions
  console.warn(`[Generator] ⚠ All LLM attempts failed for "${lessonTitle}". Generating fallback quiz questions.`)
  console.error(`[Generator] Last error:`, lastError)

  const defaultDiff = courseDifficulty === "advanced" ? "hard" : courseDifficulty === "intermediate" ? "medium" : "easy";

  // Create basic fallback questions based on lesson title
  const fallbackQuestions = [
    {
      question_text: `What is the main topic covered in "${lessonTitle}"?`,
      question_type: "mcq",
      options: [
        lessonTitle,
        "Advanced programming concepts",
        "Database management",
        "Web development basics"
      ],
      correct_answer: lessonTitle,
      explanation: `This lesson focuses on ${lessonTitle}.`,
      difficulty: defaultDiff
    },
    {
      question_text: `Which of the following best describes the key concept in "${lessonTitle}"?`,
      question_type: "mcq",
      options: [
        "A fundamental concept that requires understanding",
        "An optional advanced topic",
        "A deprecated practice",
        "A theoretical concept with no practical use"
      ],
      correct_answer: "A fundamental concept that requires understanding",
      explanation: `Understanding ${lessonTitle} is essential for mastering this topic.`,
      difficulty: defaultDiff
    },
    {
      question_text: `What should you be able to do after completing the lesson on "${lessonTitle}"?`,
      question_type: "mcq",
      options: [
        "Apply the concepts learned in practical scenarios",
        "Memorize all technical terms",
        "Skip to advanced topics",
        "Ignore the fundamentals"
      ],
      correct_answer: "Apply the concepts learned in practical scenarios",
      explanation: `The goal is to apply what you've learned about ${lessonTitle} in real-world situations.`,
      difficulty: defaultDiff
    }
  ];

  console.log(`[Generator] ✓ Generated ${fallbackQuestions.length} fallback quiz questions for "${lessonTitle}"`)
  return fallbackQuestions;
}

export async function suggestYouTubeVideos(
  topic: string,
  lessonTitle: string,
  provider: "openai" | "gemini" = "openai",
): Promise<Array<{ title: string; searchQuery: string }>> {
  const model = getLLMModel({ provider }) as any

  const prompt = YOUTUBE_SUGGESTION_PROMPT.replace("{topic}", topic).replace("{lessonTitle}", lessonTitle)

  const { text } = await retryWithExponentialBackoff(() =>
    generateText({
      model,
      prompt,
      temperature: 0.6,
      maxTokens: 1000,
    }),
  )

  const result = validateJSON(text)

  if (!Array.isArray(result)) {
    throw new Error("YouTube suggestions should return array")
  }

  return result
}

export async function generateWithFallback(
  topic: string,
  difficulty: "beginner" | "intermediate" | "advanced",
  numModules: number,
  lessonsPerModule: number,
  primaryProvider: "openai" | "gemini" = "openai",
  userId?: string,
): Promise<{ outline: CourseOutline; provider: "openai" | "gemini"; retryCount: number }> {
  let retryCount = 0
  let lastError: Error | null = null

  // Try primary provider
  try {
    const outline = await generateCourseOutline(topic, difficulty, numModules, lessonsPerModule, primaryProvider, userId)
    return { outline, provider: primaryProvider, retryCount }
  } catch (error) {
    lastError = error as Error
    retryCount++
  }

  // Try fallback provider
  const fallbackProvider = primaryProvider === "openai" ? "gemini" : "openai"
  try {
    const outline = await generateCourseOutline(topic, difficulty, numModules, lessonsPerModule, fallbackProvider, userId)
    return { outline, provider: fallbackProvider, retryCount }
  } catch (error) {
    lastError = error as Error
    retryCount++
  }

  throw new Error(`Course generation failed with both providers. Last error: ${lastError?.message}`)
}

import { COURSE_TITLE_FROM_VIDEOS_PROMPT } from "./prompts"

export async function generateCourseTitleFromVideos(
  videoTitles: string[],
  provider: "openai" | "gemini" = "openai",
): Promise<{ title: string; description: string }> {
  try {
    const model = getLLMModel({ provider }) as any
    // Take first 15 titles to avoid hitting token limits
    const titlesSnippet = videoTitles.slice(0, 15).map(t => `- ${t}`).join("\n")

    const prompt = COURSE_TITLE_FROM_VIDEOS_PROMPT.replace("{videoTitles}", titlesSnippet)

    const response = await generateText({
      model,
      prompt,
      temperature: 0.5,
      maxTokens: 500,
    })

    const result = validateJSON(response.text)
    return {
      title: result.courseTitle || "Custom Course",
      description: result.courseDescription || "A video-based course."
    }
  } catch (e) {
    console.warn("Failed to generate title from videos:", e)
    return { title: "Video Course", description: "Created from YouTube playlist." }
  }
}
