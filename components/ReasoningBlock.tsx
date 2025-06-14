import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ReasoningBlockProps {
  content: string;
}

export function ReasoningBlock({ content }: ReasoningBlockProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [reasoning, setReasoning] = useState('');

  useEffect(() => {
    // Extract reasoning content between <think> tags
    const match = content.match(/<think>(.*?)<\/think>/s);
    if (match) {
      setReasoning(match[1].trim());
    }
  }, [content]);

  if (!reasoning) return null;

  return (
    <div className="my-2 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <span>Reasoning</span>
        {isVisible ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {isVisible && (
        <div className="px-4 py-2 text-sm italic text-gray-600 dark:text-gray-300">
          {reasoning}
        </div>
      )}
    </div>
  );
} 