export interface Skill {
    name: string
    count: number
    level: number // 1-100
    category: 'language' | 'frontend' | 'backend' | 'devops' | 'mobile' | 'concept' | 'science' | 'math' | 'humanities' | 'other'
}

const SKILL_DICTIONARY: Record<string, { name: string, category: Skill['category'] }> = {
    // Programming Languages
    'javascript': { name: 'JavaScript', category: 'language' },
    'js': { name: 'JavaScript', category: 'language' },
    'typescript': { name: 'TypeScript', category: 'language' },
    'ts': { name: 'TypeScript', category: 'language' },
    'python': { name: 'Python', category: 'language' },
    'py': { name: 'Python', category: 'language' },
    'java': { name: 'Java', category: 'language' },
    'c++': { name: 'C++', category: 'language' },
    'cpp': { name: 'C++', category: 'language' },
    'c': { name: 'C', category: 'language' },
    'c#': { name: 'C#', category: 'language' },
    'csharp': { name: 'C#', category: 'language' },
    'ruby': { name: 'Ruby', category: 'language' },
    'go': { name: 'Go', category: 'language' },
    'rust': { name: 'Rust', category: 'language' },
    'php': { name: 'PHP', category: 'language' },
    'swift': { name: 'Swift', category: 'language' },
    'kotlin': { name: 'Kotlin', category: 'language' },

    // Frontend
    'react': { name: 'React', category: 'frontend' },
    'nextjs': { name: 'Next.js', category: 'frontend' },
    'next.js': { name: 'Next.js', category: 'frontend' },
    'vue': { name: 'Vue.js', category: 'frontend' },
    'angular': { name: 'Angular', category: 'frontend' },
    'html': { name: 'HTML5', category: 'frontend' },
    'css': { name: 'CSS3', category: 'frontend' },
    'tailwind': { name: 'Tailwind CSS', category: 'frontend' },

    // Backend
    'node': { name: 'Node.js', category: 'backend' },
    'node.js': { name: 'Node.js', category: 'backend' },
    'express': { name: 'Express.js', category: 'backend' },
    'django': { name: 'Django', category: 'backend' },
    'flask': { name: 'Flask', category: 'backend' },
    'spring': { name: 'Spring Boot', category: 'backend' },
    'sql': { name: 'SQL', category: 'backend' },
    'postgres': { name: 'PostgreSQL', category: 'backend' },
    'mysql': { name: 'MySQL', category: 'backend' },
    'mongodb': { name: 'MongoDB', category: 'backend' },

    // Science & Physics
    'physics': { name: 'Physics', category: 'science' },
    'orbital': { name: 'Astrophysics', category: 'science' },
    'dynamics': { name: 'Physics', category: 'science' },
    'chemistry': { name: 'Chemistry', category: 'science' },
    'biology': { name: 'Biology', category: 'science' },
    'science': { name: 'General Science', category: 'science' },
    'astronomy': { name: 'Astronomy', category: 'science' },
    'space': { name: 'Space Science', category: 'science' },

    // Math
    'math': { name: 'Mathematics', category: 'math' },
    'mathematics': { name: 'Mathematics', category: 'math' },
    'algebra': { name: 'Algebra', category: 'math' },
    'calculus': { name: 'Calculus', category: 'math' },
    'geometry': { name: 'Geometry', category: 'math' },
    'statistics': { name: 'Statistics', category: 'math' },
    'probability': { name: 'Probability', category: 'math' },

    // Humanities / History
    'history': { name: 'History', category: 'humanities' },
    'geography': { name: 'Geography', category: 'humanities' },
    'literature': { name: 'Literature', category: 'humanities' },
    'economics': { name: 'Economics', category: 'humanities' },

    // Concepts
    'pointer': { name: 'Memory Management', category: 'concept' },
    'pointers': { name: 'Memory Management', category: 'concept' },
    'algorithm': { name: 'Algorithms', category: 'concept' },
    'algorithms': { name: 'Algorithms', category: 'concept' },
    'structure': { name: 'Data Structures', category: 'concept' },
    'structures': { name: 'Data Structures', category: 'concept' },
    'dsa': { name: 'DSA', category: 'concept' },
    'oop': { name: 'OOP', category: 'concept' },
    'system': { name: 'System Design', category: 'concept' },
    'api': { name: 'API Design', category: 'concept' },
    'rest': { name: 'REST API', category: 'concept' },
    'graphql': { name: 'GraphQL', category: 'concept' },
    'ai': { name: 'Artificial Intelligence', category: 'concept' },
    'ml': { name: 'Machine Learning', category: 'concept' },
    'machine': { name: 'Machine Learning', category: 'concept' },
}

export function extractSkillsFromCourses(courses: any[]): Skill[] {
    const skillCounts: Record<string, number> = {}

    // Helper to normalize and tokenize text
    const tokenize = (text: string) => {
        return text.toLowerCase()
            .replace(/[^\w\s\+\#\.]/g, ' ') // Keep +, #, . for C++, C#, Node.js
            .split(/\s+/)
    }

    courses.forEach(course => {
        const tokens = [
            ...tokenize(course.title || ''),
            ...tokenize(course.topic || ''),
            ...tokenize(course.description || '')
        ]

        const uniqueSkillsInCourse = new Set<string>()

        tokens.forEach(token => {
            if (SKILL_DICTIONARY[token]) {
                uniqueSkillsInCourse.add(SKILL_DICTIONARY[token].name)
            }
        })

        // Special handling for "Machine Learning" if separate tokens "machine" and "learning" appear? 
        // For now dictionary has "machine" -> "Machine Learning" which might be aggressive, but okay for this context.

        uniqueSkillsInCourse.forEach(skillName => {
            skillCounts[skillName] = (skillCounts[skillName] || 0) + 1
        })
    })

    // Convert to array and calculate levels
    return Object.entries(skillCounts).map(([name, count]) => {
        // Find category from dictionary (reverse lookup)
        const entry = Object.values(SKILL_DICTIONARY).find(s => s.name === name)

        // Level calculation:
        // 1 course = 25% (Boosted so 1 course looks significant)
        // 2 courses = 50%
        // 4+ courses = 100%
        const level = Math.min(100, count * 25)

        return {
            name,
            count,
            level,
            category: entry?.category || 'other'
        }
    }).sort((a, b) => b.level - a.level) // Sort by proficiency
}
