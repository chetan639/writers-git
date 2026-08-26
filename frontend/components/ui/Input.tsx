import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, id, className = '', ...props },
  ref
) {
  const reactId = React.useId();
  const inputId = id ?? reactId;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        ref={ref}
        aria-describedby={hint ? `${inputId}-hint` : undefined}
        className={`field ${className}`}
      />
      {hint && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;
