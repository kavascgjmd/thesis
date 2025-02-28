import  { forwardRef } from 'react'
import { Search } from 'lucide-react'
import { InputProps } from '../../../types/index'
import { cn } from '../../lib/util'

export const SearchInput = forwardRef<HTMLInputElement, InputProps>(({
  className,
  ...props
}, ref) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      <input
        className={cn(
          "w-full rounded-full border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5",
          "focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none",
          "placeholder:text-gray-500",
          className
        )}
        type="search"
        ref={ref}
        {...props}
      />
    </div>
  )
})

SearchInput.displayName = 'SearchInput'