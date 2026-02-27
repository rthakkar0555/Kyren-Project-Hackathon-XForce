"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Lesson {
  content?: string
}

interface LessonContentProps {
  lesson: Lesson
}

export default function LessonContent({ lesson }: LessonContentProps) {
  if (!lesson.content) return null

  // Clean the content to handle common LLM formatting issues
  const cleanContent = lesson.content
    .replace(/^```markdown\s*/i, '') // Remove starting ```markdown
    .replace(/^```\s*/, '') // Remove starting ```
    .replace(/```\s*$/, '') // Remove ending ```
    .replace(/\\n/g, '\n') // Fix escaped newlines
    .replace(/^["']|["']$/g, '') // Remove wrapping quotes if present
    .trim()

  return (
    <div className="border-2 border-border p-8 bg-card prose prose-lg prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-4xl font-bold mb-6 mt-8 text-foreground border-b-2 border-border pb-3">{props.children}</h1>
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-3xl font-bold mb-4 mt-6 text-foreground">{props.children}</h2>
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-2xl font-semibold mb-3 mt-5 text-foreground">{props.children}</h3>
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-xl font-semibold mb-2 mt-4 text-foreground">{props.children}</h4>
          ),
          p: ({ node, ...props }) => (
            <p className="text-base leading-relaxed mb-4 text-foreground">{props.children}</p>
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside mb-4 space-y-2 text-foreground">{props.children}</ul>
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2 text-foreground">{props.children}</ol>
          ),
          li: ({ node, ...props }) => (
            <li className="text-base leading-relaxed text-foreground ml-4">{props.children}</li>
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 italic bg-muted/50 text-muted-foreground">{props.children}</blockquote>
          ),
          code: ({ node, inline, className, children, ...props }: any) =>
            inline ? (
              <code className="bg-muted px-2 py-1 rounded text-sm font-mono text-primary">{children}</code>
            ) : (
              <code className="block bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4 border border-border">{children}</code>
            ),
          pre: ({ node, ...props }) => (
            <pre className="bg-zinc-900 p-4 rounded-lg overflow-x-auto mb-4 border-2 border-border">{props.children}</pre>
          ),
          a: ({ node, ...props }) => (
            <a className="text-primary underline hover:text-primary/80 transition-colors" href={props.href}>{props.children}</a>
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-foreground">{props.children}</strong>
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-foreground">{props.children}</em>
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-t-2 border-border" />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border-2 border-border">{props.children}</table>
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">{props.children}</th>
          ),
          td: ({ node, ...props }) => (
            <td className="border border-border px-4 py-2">{props.children}</td>
          ),
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  )
}
