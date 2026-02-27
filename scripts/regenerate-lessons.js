/**
 * Script to regenerate lessons for an existing course
 * This will create lessons for modules that have 0 lessons
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

if (!openaiKey && !geminiKey) {
    console.error("❌ Missing OPENAI_API_KEY or GEMINI_API_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function regenerateLessons(courseId) {
    console.log(`\n🔄 Regenerating lessons for course: ${courseId}\n`);

    // Get course
    const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

    if (!course) {
        console.error("❌ Course not found");
        return;
    }

    console.log(`📚 Course: ${course.title}`);
    console.log(`   Topic: ${course.topic}`);

    // Get modules
    const { data: modules } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('module_order');

    if (!modules || modules.length === 0) {
        console.error("❌ No modules found");
        return;
    }

    console.log(`\n📖 Found ${modules.length} modules\n`);

    // For each module, create sample lessons
    for (const module of modules) {
        const { data: existingLessons } = await supabase
            .from('lessons')
            .select('id')
            .eq('module_id', module.id);

        if (existingLessons && existingLessons.length > 0) {
            console.log(`✓ Module "${module.title}" already has ${existingLessons.length} lessons, skipping...`);
            continue;
        }

        console.log(`🔨 Creating lessons for: ${module.title}`);

        // Create 3-4 sample lessons per module
        const lessonCount = 3 + Math.floor(Math.random() * 2); // 3 or 4 lessons

        for (let i = 0; i < lessonCount; i++) {
            const lessonTitle = `Lesson ${i + 1}: ${module.title} - Part ${i + 1}`;
            const lessonContent = `
# ${lessonTitle}

## Overview
This lesson covers important concepts related to ${module.title}.

## Key Concepts
1. Understanding the fundamentals
2. Practical applications
3. Best practices and common patterns

## Learning Objectives
- Master the core concepts of ${module.title}
- Apply knowledge to real-world scenarios
- Develop practical skills

## Content
${module.description || 'Detailed content about this topic will be covered in this lesson.'}

## Summary
This lesson provides a comprehensive introduction to the key aspects of ${module.title}.
            `.trim();

            // Sample YouTube videos
            const youtubeVideos = [
                {
                    title: `${course.topic} - ${module.title} Tutorial`,
                    searchQuery: `${course.topic} ${module.title} tutorial`,
                    channelName: "Educational Channel"
                },
                {
                    title: `Learn ${module.title} in ${course.topic}`,
                    searchQuery: `${module.title} ${course.topic} explained`,
                    channelName: "Tech Academy"
                }
            ];

            // Insert lesson
            const { data: lesson, error: lessonError } = await supabase
                .from('lessons')
                .insert({
                    module_id: module.id,
                    title: lessonTitle,
                    content: lessonContent,
                    lesson_order: i,
                    learning_objectives: [
                        `Understand ${module.title} fundamentals`,
                        `Apply concepts in practice`,
                        `Master key techniques`
                    ],
                    key_points: [
                        'Core concepts',
                        'Practical applications',
                        'Best practices'
                    ],
                    practical_tasks: [
                        'Complete the exercises',
                        'Review the examples',
                        'Practice the concepts'
                    ],
                    youtube_suggestions: youtubeVideos,
                    estimated_minutes: 20 + (i * 5)
                })
                .select()
                .single();

            if (lessonError) {
                console.error(`   ❌ Failed to create lesson ${i + 1}:`, lessonError.message);
                continue;
            }

            console.log(`   ✓ Created: ${lessonTitle}`);

            // Create quiz questions
            const quizQuestions = [
                {
                    lesson_id: lesson.id,
                    course_id: courseId,
                    question_text: `What is the main concept covered in ${module.title}?`,
                    question_type: 'mcq',
                    options: {
                        'A': 'Option A - Correct answer',
                        'B': 'Option B',
                        'C': 'Option C',
                        'D': 'Option D'
                    },
                    correct_answer: 'A',
                    explanation: 'This is the correct answer because it directly addresses the main concept.',
                    difficulty: 'medium'
                },
                {
                    lesson_id: lesson.id,
                    course_id: courseId,
                    question_text: `Which of the following is a key principle of ${module.title}?`,
                    question_type: 'mcq',
                    options: {
                        'A': 'Principle 1',
                        'B': 'Principle 2 - Correct',
                        'C': 'Principle 3',
                        'D': 'Principle 4'
                    },
                    correct_answer: 'B',
                    explanation: 'This principle is fundamental to understanding the topic.',
                    difficulty: 'easy'
                }
            ];

            const { error: quizError } = await supabase
                .from('quiz_questions')
                .insert(quizQuestions);

            if (quizError) {
                console.error(`   ⚠️  Failed to create quiz questions:`, quizError.message);
            } else {
                console.log(`   ✓ Created ${quizQuestions.length} quiz questions`);
            }
        }

        console.log(`✅ Completed module: ${module.title}\n`);
    }

    console.log("🎉 Lesson regeneration complete!\n");
}

const courseId = process.argv[2];

if (!courseId) {
    console.log("Usage: node scripts/regenerate-lessons.js <courseId>");
    console.log("\nExample: node scripts/regenerate-lessons.js 224bb6b6-1852-4cdc-9e8b-8fb6ca82871c");
    process.exit(1);
}

regenerateLessons(courseId).catch(err => {
    console.error("❌ Error:", err.message);
    console.error(err);
    process.exit(1);
});
