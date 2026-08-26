import React from 'react';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium ' +
  'transition-[background-color,color,border-color,box-shadow,transform] duration-150 ' +
  'active:translate-y-px disabled:pointer-events-none select-none whitespace-nowrap';

// A flat, quiet "not available yet" rather than a half-faded solid block, which
// reads as a rendering bug on a filled button.
const disabledSolid =
  'disabled:bg-surface-2 disabled:text-ink-3 disabled:shadow-none disabled:ring-1 disabled:ring-rule';

const variants: Record<Variant, string> = {
  primary:
    `bg-ink text-ink-inverse shadow-soft hover:bg-ink/90 hover:shadow-lift ${disabledSolid}`,
  accent:
    `bg-accent text-accent-ink shadow-soft hover:bg-accent-hover hover:shadow-lift ${disabledSolid}`,
  secondary:
    'bg-surface text-ink border border-rule-strong hover:bg-surface-hover hover:border-ink-3 disabled:opacity-45',
  ghost:
    'text-ink-2 hover:bg-surface-hover hover:text-ink disabled:opacity-45',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-[15px]',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
        />
      )}
      {children}
    </button>
  );
}
