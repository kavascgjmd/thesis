import React from 'react';

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, id, disabled = false, className = '' }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 
          border-transparent transition-colors duration-200 ease-in-out 
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${checked ? 'bg-blue-600' : 'bg-gray-200'} 
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow 
            transform transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';