/**
 * Test script to verify course generation and lesson creation
 * Run with: node scripts/test-course-generation.js <courseId>
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectCourse(courseId) {
    console.log(`\n🔍 Inspecting Course: ${courseId}\n`);

    // 1. Get Course Details
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

    if (courseError || !course) {
        console.error("❌ Course not found:", courseError?.message);
        return;
    }

    console.log("✅ Course Found:");
    console.log(`   Title: ${course.title}`);
    console.log(`   Topic: ${course.topic}`);
    console.log(`   Status: ${course.status}`);
    console.log(`   Difficulty: ${course.difficulty_level}`);

    // 2. Get Modules
    const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('module_order');

    if (modulesError) {
        console.error("❌ Error fetching modules:", modulesError.message);
        return;
    }

    console.log(`\n📚 Modules: ${modules?.length || 0}`);

    if (!modules || modules.length === 0) {
        console.warn("⚠️  No modules found for this course!");
        return;
    }

    // 3. Get Lessons for each module
    for (const module of modules) {
        const { data: lessons, error: lessonsError } = await supabase
            .from('lessons')
            .select('*')
            .eq('module_id', module.id)
            .order('lesson_order');

        console.log(`\n   Module ${module.module_order + 1}: ${module.title}`);
        console.log(`   └─ Lessons: ${lessons?.length || 0}`);

        if (lessons && lessons.length > 0) {
            for (const lesson of lessons) {
                console.log(`      ├─ ${lesson.title}`);
                console.log(`      │  ├─ Content: ${lesson.content ? '✅' : '❌'} (${lesson.content?.length || 0} chars)`);
                console.log(`      │  ├─ YouTube Videos: ${lesson.youtube_suggestions?.length || 0}`);

                if (lesson.youtube_suggestions && lesson.youtube_suggestions.length > 0) {
                    lesson.youtube_suggestions.forEach((vid, idx) => {
                        console.log(`      │  │  ${idx + 1}. ${vid.title || vid.searchQuery}`);
                        if (vid.videoId) {
                            console.log(`      │  │     Video ID: ${vid.videoId}`);
                        }
                    });
                }

                // Get quiz questions
                const { data: quizzes } = await supabase
                    .from('quiz_questions')
                    .select('*')
                    .eq('lesson_id', lesson.id);

                console.log(`      │  └─ Quiz Questions: ${quizzes?.length || 0}`);
            }
        } else {
            console.warn(`      └─ ⚠️  No lessons found for this module!`);
        }
    }

    console.log("\n✅ Inspection Complete\n");
}

// Get courseId from command line
const courseId = process.argv[2];

if (!courseId) {
    console.log("Usage: node scripts/test-course-generation.js <courseId>");
    console.log("\nExample: node scripts/test-course-generation.js 224bb6b6-1852-4cdc-9e8b-8fb6ca82871c");
    process.exit(1);
}

inspectCourse(courseId).catch(err => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
