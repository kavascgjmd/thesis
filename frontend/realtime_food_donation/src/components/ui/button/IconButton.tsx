import  { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { IconButtonProps } from '../../../types/index'
import { cn } from '../../lib/util'

const buttonVariants = {
  primary: "bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
  outline: "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 active:bg-gray-100",
  ghost: "text-gray-600 hover:bg-gray-100 active:bg-gray-200",
  danger: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  className,
  variant = "ghost",
  size = "md",
  icon: Icon,
  loading,
  ...props
}, ref) => {
  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-3",
  }

  return (
    <button
      ref={ref}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-rose-500/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Icon className="h-5 w-5" />
      )}
    </button>
  )
})

IconButton.displayName = 'IconButton'