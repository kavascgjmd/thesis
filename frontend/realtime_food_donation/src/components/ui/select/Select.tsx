import { forwardRef, createContext, useContext, useState } from 'react'
import { SelectProps } from '../../../types/index'
import { cn } from '../../lib/util'

// Create context for the select component
type SelectContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined)

const useSelectContext = () => {
  const context = useContext(SelectContext)
  if (!context) {
    throw new Error('Select compound components must be used within a Select component')
  }
  return context
}

// Main Select component
export const Select = forwardRef<HTMLDivElement, {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}>(({
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  children,
  ...props
}, ref) => {
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(value || defaultValue || '')

  const handleValueChange = (newValue: string) => {
    if (!value) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
    setOpen(false)
  }

  return (
    <SelectContext.Provider 
      value={{
        open,
        setOpen,
        value: value !== undefined ? value : internalValue,
        onValueChange: handleValueChange
      }}
    >
      <div ref={ref} {...props} className="relative" data-disabled={disabled}>
        {children}
      </div>
    </SelectContext.Provider>
  )
})

Select.displayName = 'Select'

// SelectTrigger component
export const SelectTrigger = forwardRef<HTMLButtonElement, {
  className?: string;
  children: React.ReactNode;
}>(({
  className,
  children,
  ...props
}, ref) => {
  const { open, setOpen, value } = useSelectContext()
  
  return (
    <button
      type="button"
      ref={ref}
      onClick={() => setOpen(!open)}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-left text-gray-900",
        "focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      aria-expanded={open}
      {...props}
    >
      {children}
      <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
      </svg>
    </button>
  )
})

SelectTrigger.displayName = 'SelectTrigger'

// SelectValue component
export const SelectValue = forwardRef<HTMLSpanElement, {
  placeholder?: string;
  className?: string;
}>(({
  placeholder,
  className,
  ...props
}, ref) => {
  const { value } = useSelectContext()
  
  return (
    <span ref={ref} {...props} className={cn(className)}>
      {value || placeholder || "Select an option"}
    </span>
  )
})

SelectValue.displayName = 'SelectValue'

// SelectContent component
export const SelectContent = forwardRef<HTMLDivElement, {
  className?: string;
  children: React.ReactNode;
}>(({
  className,
  children,
  ...props
}, ref) => {
  const { open } = useSelectContext()
  
  if (!open) return null
  
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

SelectContent.displayName = 'SelectContent'

// SelectItem component
export const SelectItem = forwardRef<HTMLDivElement, {
  className?: string;
  children: React.ReactNode;
  value: string;
}>(({
  className,
  children,
  value,
  ...props
}, ref) => {
  const { onValueChange, value: selectedValue } = useSelectContext()
  const isSelected = selectedValue === value
  
  return (
    <div
      ref={ref}
      className={cn(
        "relative cursor-pointer select-none py-2 pl-10 pr-4 text-gray-900",
        "hover:bg-rose-50",
        isSelected && "bg-rose-50 text-rose-600",
        className
      )}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {isSelected && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-rose-600">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        </span>
      )}
      {children}
    </div>
  )
})

SelectItem.displayName = 'SelectItem'