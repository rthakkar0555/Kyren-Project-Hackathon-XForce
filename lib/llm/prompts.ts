export const COURSE_VALIDATION_PROMPT = `You are an expert curriculum designer. Validate the following course topic:
Topic: {topic}

Respond with JSON:
{
  "isValid": boolean,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "reasoning": "string",
  "suggestedTitle": "string",
  "estimatedModules": number
}`

export const COURSE_OUTLINE_PROMPT = `You are an expert course designer. Create a detailed course outline for:
Topic: {topic}
Difficulty: {difficulty}
Number of Modules: {numModules} (Target 5-7 modules)
Lessons per Module: {lessonsPerModule} (Target 3-6 lessons per module)

CRITICAL REQUIREMENTS:
1. Every module MUST have between 3 to 6 lessons.
2. DO NOT create empty modules.
3. Each module must have a clear, descriptive title and summary.
4. Lessons must cover the topic deeply, from beginner to advanced.

Respond with valid JSON only (no markdown, no explanation):
{
  "courseTitle": "string",
  "courseDescription": "string",
  "learningGoals": ["string"],
  "modules": [
    {
      "title": "Module Title",
      "description": "Module summary",
      "estimatedHours": number,
      "lessons": [
        {
          "title": "Lesson Title",
          "objectives": ["string"],
          "keyPoints": ["string"],
          "content": "string (Brief overview)",
          "youtubeTopics": ["string"],
          "practicalTasks": ["string"],
          "estimatedMinutes": number
        }
      ]
    }
  ]
}`

export const LESSON_EXPANSION_PROMPT = `You are a professional educator. Expand this lesson into a comprehensive study guide:
Lesson: {lessonTitle}
Context: {lessonContext}

Requirements:
1. detailed explanation of concepts.
2. Real-world examples.
3. Key takeaways.
4. Content must be accurate and hallucination-free.

Output format: Markdown string.`

export const QUIZ_GENERATION_PROMPT = `Generate a rigorous quiz for this lesson:
Lesson: {lessonTitle}
Content: {lessonContent}
Course Difficulty: {courseDifficulty}

Requirements:
1. Create 8 to 12 Multiple Choice Questions (MCQ).
2. Each question must have a clear "correct_answer".
3. Provide a brief "explanation" for the correct answer.
4. Ensure the quiz difficulty Strictly matches the Course Difficulty ({courseDifficulty}). For "advanced", all questions MUST be advanced/hard. For "intermediate", they should be intermediate/medium. For "beginner", easy/medium.

Respond with valid JSON array:
[
  {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "answer": "string (must match one option exactly)",
    "explanation": "string",
    "difficulty": "easy" | "medium" | "hard"
  }
]`

export const YOUTUBE_SUGGESTION_PROMPT = `Suggest 3-5 high-quality YouTube videos relevant to:
Topic: {topic}
Lesson: {lessonTitle}

Requirements:
1. Real, popular channels (e.g., CrashCourse, FreeCodeCamp, etc. where applicable).
2. Accurate titles.

Respond with valid JSON array:
[
  {
    "title": "Video Title",
    "channelName": "Channel Name",
    "searchQuery": "YouTube Search Query"
  }
]`

export const VALIDATION_SCHEMA = {
  courseTitle: { type: "string", required: true, minLength: 5 },
  courseDescription: { type: "string", required: true, minLength: 20 },
  learningGoals: { type: "array", required: true, minLength: 3 },
  modules: { type: "array", required: true, minLength: 1 },
}

export const COURSE_TITLE_FROM_VIDEOS_PROMPT = `Analyze the following list of video titles and suggest a professional, concise, and descriptive course title.
Video Titles:
{videoTitles}

Respond with valid JSON:
{
  "courseTitle": "string",
  "courseDescription": "string (1-2 sentences summarizing what this course covers)"
}`
