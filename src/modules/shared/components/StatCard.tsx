import React from 'react';

export interface StatCardProps {
  icon: React.ComponentType<any> | null;
  label: string;
  value: string;
  subValue?: string;
  colorClass?: string;
  bgColor?: string;
  /** Optional CSS style applied to the value element (e.g. blur for privacy mode) */
  valueStyle?: React.CSSProperties;
}

/**
 * Bento-style stat card used across Dashboard and other summary pages.
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  colorClass,
  bgColor,
  valueStyle,
}: StatCardProps) {
  const getValueFontSize = (val: string) => {
    if (!val) return '1.5rem';
    const str = String(val);
    if (str.length > 20) return '0.95rem';
    if (str.length > 16) return '1.1rem';
    if (str.length > 13) return '1.25rem';
    if (str.length > 10) return '1.4rem';
    return '1.65rem';
  };

  const dynamicFontSize = getValueFontSize(value);

  return (
    <div className="bento-card" style={{ justifyContent: 'center', height: '100%', overflow: 'hidden', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.3, wordBreak: 'break-word', flex: 1, minWidth: 0 }}>
          {label}
        </span>
        {Icon && (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            background: bgColor || 'var(--accent-blue-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color:
              colorClass === 'text-profit'
                ? 'var(--accent-green)'
                : colorClass === 'text-loss'
                ? 'var(--accent-red)'
                : 'var(--text-secondary)',
          }}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div
        className={`font-mono ${colorClass || ''}`}
        style={{
          fontSize: dynamicFontSize,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.25,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          maxWidth: '100%',
          minWidth: 0,
          ...valueStyle,
        }}
      >
        {value}
      </div>
      {subValue && (
        <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-word', minWidth: 0 }}>
          {subValue}
        </div>
      )}
    </div>
  );
}
