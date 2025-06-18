import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ReasoningBlockProps {
  content: string;
}

export function ReasoningBlock({ content }: ReasoningBlockProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [reasoning, setReasoning] = useState('');

  useEffect(() => {
    // Extract reasoning content between <think> tags
    const match = content.match(/<think>([\s\S]*?)<\/think>/);
    if (match) {
      setReasoning(match[1].trim());
    }
  }, [content]);

  if (!reasoning) return null;

  return (
    <div className="my-2 rounded-lg border border-border/40 bg-muted/50 backdrop-blur-sm">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
          Reasoning
        </span>
        {isVisible ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isVisible && (
        <div className="px-4 py-3 text-sm text-muted-foreground/90 border-t border-border/40">
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p className="mb-2 last:mb-0">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1 mb-3">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1 mb-3">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-sm">{children}</li>
              ),
              code: ({ children }) => (
                <code className="bg-muted/50 px-1 py-0.5 rounded text-xs">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto mb-3">{children}</pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-muted-foreground/20 pl-3 italic my-3 text-muted-foreground/80">
                  {children}
                </blockquote>
              )
            }}
          >
            {reasoning}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
} 