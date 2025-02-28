import { forwardRef } from 'react'
import { SelectProps } from '../../../types/index'
import { cn } from '../../lib/util'

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  className,
  error,
  children,
  ...props
}, ref) => {
  return (
    <div className="relative">
      <select
        className={cn(
          "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900",
          "focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "appearance-none",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
        </svg>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
})

Select.displayName = 'Select'