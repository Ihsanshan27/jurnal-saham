import React, { useState, useEffect, useRef } from 'react';

interface CurrencyInputProps {
  value: string | number;
  onChange: (value: string) => void;
  market?: 'ID' | 'US' | string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  name?: string;
  required?: boolean;
  autoFocus?: boolean;
  allowDecimal?: boolean;
}

export function formatLiveCurrency(
  rawInput: string | number,
  market: string = 'ID',
  maxDecimals: number = 4
): { display: string; clean: string } {
  if (rawInput === '' || rawInput === null || rawInput === undefined) {
    return { display: '', clean: '' };
  }

  const str = String(rawInput);
  let s = str.replace(/^[Rp$\s]+/, '').trim();
  if (!s) return { display: '', clean: '' };

  const isUS = market === 'US' || market === 'USD';
  const prefix = isUS ? '$ ' : 'Rp ';

  let hasDecimal = false;
  let integerPart = '';
  let decimalPart = '';
  let endsWithDecimal = false;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (!isUS) {
    // ID Market: Comma (,) is decimal separator. Dot (.) is thousand separator.
    if (lastComma !== -1) {
      integerPart = s.substring(0, lastComma).replace(/\./g, '').replace(/[^\d]/g, '');
      decimalPart = s.substring(lastComma + 1).replace(/[^\d]/g, '').slice(0, maxDecimals);
      hasDecimal = true;
      endsWithDecimal = s.endsWith(',');
    } else if (lastDot !== -1) {
      const parts = s.split('.');
      const isThousandPattern = parts.length > 1 && parts.slice(1).every(p => p.length === 3);

      if (isThousandPattern) {
        integerPart = s.replace(/\./g, '').replace(/[^\d]/g, '');
      } else {
        integerPart = parts[0].replace(/[^\d]/g, '');
        decimalPart = parts.slice(1).join('').replace(/[^\d]/g, '').slice(0, maxDecimals);
        hasDecimal = true;
        endsWithDecimal = s.endsWith('.');
      }
    } else {
      integerPart = s.replace(/[^\d]/g, '');
    }
  } else {
    // US Market: Dot (.) is decimal separator. Comma (,) is thousand separator.
    if (lastDot !== -1) {
      integerPart = s.substring(0, lastDot).replace(/,/g, '').replace(/[^\d]/g, '');
      decimalPart = s.substring(lastDot + 1).replace(/[^\d]/g, '').slice(0, maxDecimals);
      hasDecimal = true;
      endsWithDecimal = s.endsWith('.');
    } else if (lastComma !== -1) {
      const parts = s.split(',');
      const isThousandPattern = parts.length > 1 && parts.slice(1).every(p => p.length === 3);

      if (isThousandPattern) {
        integerPart = s.replace(/,/g, '').replace(/[^\d]/g, '');
      } else {
        integerPart = parts[0].replace(/[^\d]/g, '');
        decimalPart = parts.slice(1).join('').replace(/[^\d]/g, '').slice(0, maxDecimals);
        hasDecimal = true;
        endsWithDecimal = s.endsWith(',');
      }
    } else {
      integerPart = s.replace(/[^\d]/g, '');
    }
  }

  if (!integerPart && !decimalPart) {
    return { display: '', clean: '' };
  }

  const numInt = integerPart ? parseInt(integerPart, 10) : 0;
  const formattedInt = numInt.toLocaleString(isUS ? 'en-US' : 'id-ID');
  const decSep = isUS ? '.' : ',';

  let display = '';
  let clean = '';

  if (hasDecimal) {
    if (endsWithDecimal && !decimalPart) {
      display = `${prefix}${formattedInt}${decSep}`;
      clean = `${numInt}.`;
    } else {
      display = `${prefix}${formattedInt}${decSep}${decimalPart}`;
      clean = `${numInt}.${decimalPart}`;
    }
  } else {
    display = `${prefix}${formattedInt}`;
    clean = `${numInt}`;
  }

  return { display, clean };
}

export function formatCurrencyValue(val: number | string, market: string = 'ID'): string {
  const isUS = market === 'US' || market === 'USD';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  if (isNaN(num) || num === 0) return '';
  if (isUS) {
    return `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}`;
  }
  return `Rp ${num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}`;
}

export default function CurrencyInput({
  value,
  onChange,
  market = 'ID',
  placeholder,
  disabled = false,
  className = 'form-input',
  style = {},
  id,
  name,
  required = false,
  autoFocus = false,
  allowDecimal = true,
}: CurrencyInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const lastValueRef = useRef<string | number>(value);

  const isUS = market === 'US' || market === 'USD';

  useEffect(() => {
    const hasExternalChange = value !== lastValueRef.current;
    if (hasExternalChange || !isFocused) {
      lastValueRef.current = value;
      const display = formatCurrencyValue(value, market);
      setInputValue(display);
    }
  }, [value, market, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    if (!raw) {
      setInputValue('');
      lastValueRef.current = '';
      onChange('');
      return;
    }

    const { display, clean } = formatLiveCurrency(raw, market);
    setInputValue(display || raw);
    lastValueRef.current = clean;
    onChange(clean);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const display = formatCurrencyValue(value, market);
    setInputValue(display);
  };

  const defaultPlaceholder = placeholder || (isUS ? '$ 0.00' : 'Rp 0');

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <input
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        id={id}
        name={name}
        required={required}
        autoFocus={autoFocus}
        disabled={disabled}
        className={className}
        style={{ paddingRight: 54, ...style }}
        placeholder={defaultPlaceholder}
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      <span
        style={{
          position: 'absolute',
          right: 10,
          pointerEvents: 'none',
          fontSize: '0.68rem',
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 4,
          background: isUS ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          color: isUS ? '#3b82f6' : '#10b981',
          border: `1px solid ${isUS ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          letterSpacing: '0.04em',
          lineHeight: '1.2',
          textTransform: 'uppercase',
        }}
      >
        {isUS ? 'USD' : 'IDR'}
      </span>
    </div>
  );
}
