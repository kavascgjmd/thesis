export interface Item {
    title: string;
    description: string;
    imageUrl: string;
  }
  import { InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { LucideIcon } from 'lucide-react'

export interface BaseProps {
  className?: string
  error?: string
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseProps {
  icon?: LucideIcon
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, BaseProps {}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, BaseProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  loading?: boolean
}

export interface IconButtonProps extends ButtonProps {
  icon: LucideIcon
}
