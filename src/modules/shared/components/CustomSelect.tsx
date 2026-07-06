import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper function to merge tailwind classes if needed, though we primarily use CSS modules/classes
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi...',
  disabled = false,
  className,
  id,
  name
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    const updateCoords = () => {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + window.scrollY + 6,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };

    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (option: SelectOption) => {
    if (!option.disabled) {
      onChange(option.value);
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("custom-select-container", className)}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Hidden native input for forms if needed */}
      <input type="hidden" name={name} id={id} value={value} disabled={disabled} />
      
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "form-input", // re-use the global input style for base padding/border
          "custom-select-trigger",
          isOpen ? "focus-ring-active" : ""
        )}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          textAlign: 'left',
          width: '100%'
        }}
      >
        <span style={{ 
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontWeight: selectedOption ? 500 : 400
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Icons.ChevronDown
          size={16}
          style={{
            color: 'var(--text-muted)',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
            marginLeft: 8
          }}
        />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="custom-select-dropdown"
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            width: coords.width,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 9999,
            maxHeight: 250,
            overflowY: 'auto',
            animation: 'fadeInUp 0.15s ease',
            padding: '4px'
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
              Tidak ada opsi
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                disabled={option.disabled}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: value === option.value ? 'var(--accent-blue-dim)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: option.disabled ? 'not-allowed' : 'pointer',
                  opacity: option.disabled ? 0.5 : 1,
                  color: value === option.value ? 'var(--accent-blue-light)' : 'var(--text-primary)',
                  fontWeight: value === option.value ? 600 : 400,
                  fontSize: '0.9rem',
                  transition: 'background 0.15s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (!option.disabled && value !== option.value) {
                    e.currentTarget.style.background = 'var(--bg-card-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!option.disabled && value !== option.value) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {option.label}
                </span>
                {value === option.value && (
                  <Icons.Check size={16} style={{ color: 'var(--accent-blue-light)', flexShrink: 0 }} />
                )}
              </button>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
