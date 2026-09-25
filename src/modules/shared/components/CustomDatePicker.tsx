import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  parseISO
} from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from './CustomSelect';

interface CustomDatePickerProps {
  value: string | Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  id?: string;
  name?: string;
}

const MiniSelect = ({ value, options, onChange }: { value: number, options: {value: number, label: string}[], onChange: (val: number) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selRef.current && !selRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={selRef} style={{ position: 'relative' }}>
      <button 
        type="button" 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: isOpen ? 'var(--bg-card-hover)' : 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          fontWeight: 600,
          fontSize: '0.92rem',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => !isOpen && (e.currentTarget.style.background = 'var(--bg-card-hover)')}
        onMouseLeave={(e) => !isOpen && (e.currentTarget.style.background = 'transparent')}
      >
        {options.find(o => o.value === value)?.label}
        <Icons.ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
      </button>
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          maxHeight: 180,
          overflowY: 'auto',
          zIndex: 10005,
          minWidth: 100,
          padding: 4
        }}>
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(o.value); setIsOpen(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 12px',
                background: value === o.value ? 'var(--accent-blue-dim)' : 'transparent',
                color: value === o.value ? 'var(--accent-blue-light)' : 'var(--text-primary)',
                fontWeight: value === o.value ? 700 : 500,
                fontSize: '0.85rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { if (value !== o.value) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
              onMouseLeave={(e) => { if (value !== o.value) e.currentTarget.style.background = 'transparent'; }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const YearInput = ({ value, onChange }: { value: number, onChange: (val: number) => void }) => {
  const [localVal, setLocalVal] = useState(String(value));

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const handleBlur = () => {
    const parsed = parseInt(localVal);
    if (!isNaN(parsed) && parsed >= 1900 && parsed <= 2100) {
      onChange(parsed);
    } else {
      setLocalVal(String(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input 
      type="number" 
      value={localVal}
      onChange={e => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        width: 60,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-primary)',
        fontWeight: 600,
        fontSize: '0.92rem',
        padding: '4px 4px',
        borderRadius: 'var(--radius-sm)',
        outline: 'none',
        textAlign: 'center',
        MozAppearance: 'textfield' // removes native arrows in firefox
      }}
      className="no-spinners"
      onFocus={(e) => e.target.select()}
    />
  );
};

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Pilih Tanggal',
  disabled = false,
  className,
  minDate,
  maxDate,
  id: inputId,
  name
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  
  // Normalized selected date
  const _parsedDate = value ? (typeof value === 'string' ? parseISO(value) : value) : null;
  // Guard against Invalid Date (e.g. empty string or bad format from data)
  const selectedDate = _parsedDate && !isNaN(_parsedDate.getTime()) ? _parsedDate : null;
  
  // Current month being viewed in calendar — always a valid Date
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  });

  useEffect(() => {
    if (selectedDate && !isOpen) {
      setCurrentMonth(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate?.getTime(), isOpen]);

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

  // Update coords when open or on scroll
  useEffect(() => {
    const updateCoords = () => {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCoords(prev => {
          const newTop = rect.bottom + window.scrollY + 6;
          const newLeft = rect.left + window.scrollX;
          if (prev.top === newTop && prev.left === newLeft && prev.width === rect.width) {
            return prev;
          }
          return { top: newTop, left: newLeft, width: rect.width };
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

  const onDateClick = (day: Date) => {
    onChange(day);
    setIsOpen(false);
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // Calendar rendering logic
  const renderHeader = () => {
    const months = Array.from({ length: 12 }, (_, i) => new Date(0, i)).map((m, i) => ({ value: i, label: format(m, 'MMMM', { locale: id }) }));

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button 
          type="button" 
          onClick={prevMonth}
          style={{ padding: 4, borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Icons.ChevronLeft size={18} />
        </button>
        
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <MiniSelect 
            value={currentMonth.getMonth()} 
            options={months}
            onChange={(val) => {
              const newDate = new Date(currentMonth);
              newDate.setMonth(val);
              setCurrentMonth(newDate);
            }}
          />
          <YearInput 
            value={currentMonth.getFullYear()}
            onChange={(val) => {
              const newDate = new Date(currentMonth);
              newDate.setFullYear(val);
              setCurrentMonth(newDate);
            }}
          />
        </div>

        <button 
          type="button" 
          onClick={nextMonth}
          style={{ padding: 4, borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Icons.ChevronRight size={18} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const dateFormat = "EEEEEE";
    const days = [];
    let startDate = startOfWeek(currentMonth, { weekStartsOn: 1 });

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
          {format(addDays(startDate, i), dateFormat, { locale: id })}
        </div>
      );
    }
    return <div style={{ display: 'flex', width: '100%' }}>{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
        const isToday = isSameDay(day, new Date());
        const isCurrentMonth = isSameMonth(day, monthStart);
        
        // Disabled logic
        let isDisabled = false;
        if (minDate && day < minDate) isDisabled = true;
        if (maxDate && day > maxDate) isDisabled = true;

        let bg = 'transparent';
        let color = 'var(--text-primary)';
        let fw = 400;

        if (!isCurrentMonth) color = 'var(--text-muted)';
        if (isToday && !isSelected) {
          color = 'var(--accent-blue-light)';
          fw = 700;
        }
        if (isSelected) {
          bg = 'var(--accent-blue)';
          color = '#ffffff';
          fw = 600;
        }
        if (isDisabled) {
          color = 'var(--text-muted)';
          bg = 'transparent';
        }

        days.push(
          <div key={day.toString()} style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '2px' }}>
            <button
              type="button"
              disabled={isDisabled}
              onClick={() => onDateClick(cloneDay)}
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: bg,
                color: color,
                fontWeight: fw,
                fontSize: '0.85rem',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.4 : 1,
                border: isToday && !isSelected ? '1px solid var(--accent-blue-dim)' : '1px solid transparent',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isDisabled && !isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isDisabled && !isSelected) e.currentTarget.style.background = 'transparent';
              }}
            >
              {formattedDate}
            </button>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} style={{ display: 'flex', width: '100%' }}>
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  // formatting for display
  const displayValue = (selectedDate && !isNaN(selectedDate.getTime())) ? format(selectedDate, 'dd/MM/yyyy') : '';

  return (
    <div
      ref={containerRef}
      className={cn("custom-datepicker-container", className)}
      style={{ position: 'relative', width: '100%' }}
    >
      <input 
        type="hidden" 
        name={name} 
        id={inputId} 
        value={(selectedDate && !isNaN(selectedDate.getTime())) ? format(selectedDate, 'yyyy-MM-dd') : ''} 
      />
      
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "form-input",
          "custom-datepicker-trigger",
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
          color: displayValue ? 'var(--text-primary)' : 'var(--text-muted)',
          fontWeight: displayValue ? 500 : 400
        }}>
          {displayValue || placeholder}
        </span>
        <Icons.Calendar
          size={16}
          style={{
            color: isOpen ? 'var(--accent-blue)' : 'var(--text-muted)',
            flexShrink: 0,
            marginLeft: 8,
            transition: 'color 0.2s ease'
          }}
        />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="custom-datepicker-dropdown"
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 9999,
            width: 280,
            padding: 16,
            animation: 'fadeInUp 0.15s ease'
          }}
        >
          {renderHeader()}
          {renderDays()}
          {renderCells()}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-color)',
            paddingTop: 12,
            marginTop: 8,
            gap: 8
          }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, padding: '4px 0', fontSize: '0.75rem' }}
              disabled={minDate && addDays(new Date(), -1) < new Date(minDate)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDateClick(addDays(new Date(), -1));
              }}
            >
              Kemarin
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ flex: 1, padding: '4px 0', fontSize: '0.75rem' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDateClick(new Date());
              }}
            >
              Hari Ini
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, padding: '4px 0', fontSize: '0.75rem' }}
              disabled={maxDate && addDays(new Date(), 1) > new Date(maxDate)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDateClick(addDays(new Date(), 1));
              }}
            >
              Besok
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
