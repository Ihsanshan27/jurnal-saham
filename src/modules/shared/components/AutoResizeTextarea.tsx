import React, { useEffect, useRef } from 'react';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
}

export default function AutoResizeTextarea({ minRows = 1, className, style, value, onChange, ...props }: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height to recalculate
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className={className}
      style={{
        ...style,
        overflow: 'hidden', // Prevent scrollbar when resizing
        minHeight: `${minRows * 1.5}rem`,
      }}
      value={value}
      onChange={(e) => {
        const textarea = e.target;
        textarea.style.height = 'auto'; // Reset height to recalculate on typing
        textarea.style.height = `${textarea.scrollHeight}px`;
        if (onChange) onChange(e);
      }}
      {...props}
    />
  );
}
