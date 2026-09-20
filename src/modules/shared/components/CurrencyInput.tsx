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
  const [inputValue, setInputValue] = useState('');

  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  const isUS = market === 'US';

  useEffect(() => {
    if (value !== '' && value !== null && value !== undefined && !isNaN(numValue) && numValue > 0) {
      setInputValue(formatCurrencyValue(numValue, market));
    } else {
      setInputValue('');
    }
  }, [value, market, numValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (isUS) {
      const clean = val.replace(/[^\d.]/g, '');
      const parts = clean.split('.');
      let sanitized = clean;
      if (parts.length > 2) {
        sanitized = `${parts[0]}.${parts.slice(1).join('')}`;
      }
      onChange(sanitized);
      const parsed = parseFloat(sanitized);
      if (!isNaN(parsed) && parsed > 0) {
        setInputValue(formatCurrencyValue(parsed, 'US'));
      } else {
        setInputValue(val);
      }
    } else {
      const clean = val.replace(/[^\d]/g, '');
      onChange(clean);
      if (clean !== '') {
        const parsed = parseInt(clean, 10);
        setInputValue(formatCurrencyValue(parsed, 'ID'));
      } else {
        setInputValue('');
      }
    }
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
      value={inputValue}
      onChange={handleChange}
    />
  );
}
