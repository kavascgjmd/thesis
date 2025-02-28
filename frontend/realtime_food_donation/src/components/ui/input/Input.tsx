import  { forwardRef } from 'react'
import { InputProps } from '../../../types/index'
import { cn } from '../../lib/util'

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className,
  error,
  icon: Icon,
  ...props
}, ref) => {
  return (
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <input
        className={cn(
          "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900",
          "focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "placeholder:text-gray-500",
          Icon && "pl-10",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'