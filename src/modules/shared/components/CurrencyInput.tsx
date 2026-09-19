import React, { useState, useEffect } from 'react';

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
}

export function formatCurrencyValue(val: number | string, market: string = 'ID'): string {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num) || num === 0) return '';
  if (market === 'US') {
    return `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}`;
  }
  return `Rp ${num.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
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
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const numValue = typeof value === 'number' ? value : parseFloat(value);
  const isUS = market === 'US';

  useEffect(() => {
    if (!focused) {
      if (value !== '' && value !== null && value !== undefined && !isNaN(numValue) && numValue > 0) {
        setInputValue(formatCurrencyValue(numValue, market));
      } else {
        setInputValue(value !== undefined && value !== null ? String(value) : '');
      }
    }
  }, [value, market, focused, numValue]);

  const handleFocus = () => {
    setFocused(true);
    // On focus, show raw clean number so editing is seamless
    if (value !== '' && value !== null && value !== undefined) {
      setInputValue(String(value));
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(inputValue.replace(/[^\d.]/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      onChange(String(parsed));
      setInputValue(formatCurrencyValue(parsed, market));
    } else if (inputValue.trim() === '') {
      onChange('');
      setInputValue('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    // Extract valid numeric characters (digits and at most one decimal point)
    let clean = val;
    if (isUS) {
      clean = val.replace(/[^\d.]/g, '');
      const parts = clean.split('.');
      if (parts.length > 2) {
        clean = `${parts[0]}.${parts.slice(1).join('')}`;
      }
    } else {
      clean = val.replace(/[^\d]/g, '');
    }

    onChange(clean);
  };

  const defaultPlaceholder = placeholder || (isUS ? '$ 0.00' : 'Rp 0');

  return (
    <input
      type="text"
      inputMode={isUS ? 'decimal' : 'numeric'}
      id={id}
      name={name}
      required={required}
      autoFocus={autoFocus}
      disabled={disabled}
      className={className}
      style={{ ...style }}
      placeholder={defaultPlaceholder}
      value={focused ? inputValue : (value ? formatCurrencyValue(value, market) : inputValue)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
    />
  );
}
