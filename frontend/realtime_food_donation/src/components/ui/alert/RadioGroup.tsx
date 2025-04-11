import * as React from 'react';

type RadioGroupContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue>({});

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, defaultValue, onValueChange, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    
    const groupValue = value !== undefined ? value : internalValue;
    
    const handleValueChange = React.useCallback(
      (newValue: string) => {
        setInternalValue(newValue);
        onValueChange?.(newValue);
      },
      [onValueChange]
    );

    return (
      <RadioGroupContext.Provider
        value={{
          value: groupValue,
          onValueChange: handleValueChange,
        }}
      >
        <div
          ref={ref}
          className={`grid gap-2 ${className || ''}`}
          role="radiogroup"
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);

RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, disabled, required, id, ...props }, ref) => {
    const { value: groupValue, onValueChange } = React.useContext(RadioGroupContext);
    const checked = groupValue === value;

    return (
      <div className="flex items-center">
        <input
          ref={ref}
          type="radio"
          id={id}
          className="sr-only"
          value={value}
          checked={checked}
          disabled={disabled}
          required={required}
          onChange={(e) => {
            if (e.target.checked) {
              onValueChange?.(value);
            }
          }}
          aria-checked={checked}
          {...props}
        />
        <div
          className={`relative flex h-4 w-4 items-center justify-center rounded-full border 
          ${checked 
            ? 'border-blue-600 bg-blue-100' 
            : 'border-gray-300 bg-white'} 
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${className || ''}`}
          onClick={() => {
            if (!disabled) {
              onValueChange?.(value);
            }
          }}
        >
          {checked && (
            <div className="h-2 w-2 rounded-full bg-blue-600" />
          )}
        </div>
      </div>
    );
  }
);

RadioGroupItem.displayName = "RadioGroupItem";