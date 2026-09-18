import React from 'react';

interface RichTextRendererProps {
  content?: string | null;
  className?: string;
  fallbackText?: string;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  content,
  className = '',
  fallbackText = '-',
}) => {
  if (!content || content.trim() === '' || content === '<p></p>') {
    return <span className="text-gray-400 italic">{fallbackText}</span>;
  }

  // Check if content is HTML (starts with < tag or contains HTML tags)
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (!isHtml) {
    // Preserve newlines for legacy plain text
    return (
      <div className={`rich-text-rendered legacy-plain-text ${className}`} style={{ whiteSpace: 'pre-wrap' }}>
        {content}
      </div>
    );
  }

  return (
    <div
      className={`rich-text-rendered ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default RichTextRenderer;
