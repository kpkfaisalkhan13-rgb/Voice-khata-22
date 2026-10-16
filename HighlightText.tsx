import React from 'react';

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * Escapes regex special characters in a search string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * HighlightText component splits text by the search query and highlights matching substrings
 */
export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  query,
  className = '',
  highlightClassName = 'bg-amber-400/30 text-amber-200 px-0.5 rounded font-bold border border-amber-400/40',
}) => {
  if (!query || !query.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  const trimmedQuery = query.trim();
  const escapedQuery = escapeRegExp(trimmedQuery);

  try {
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return (
      <span className={className}>
        {parts.map((part, index) => {
          const isMatch = part.toLowerCase() === trimmedQuery.toLowerCase();
          return isMatch ? (
            <mark key={index} className={highlightClassName}>
              {part}
            </mark>
          ) : (
            <React.Fragment key={index}>{part}</React.Fragment>
          );
        })}
      </span>
    );
  } catch {
    return <span className={className}>{text}</span>;
  }
};
