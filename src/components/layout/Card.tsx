import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  variant?: 'default' | 'elevated' | 'flat'
  padding?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
}: CardProps) {
  const baseClasses = 'rounded-2xl'

  const variantClasses: Record<string, string> = {
    default: 'bg-white dark:bg-[#1c1c1e] shadow-card dark:shadow-card-dark',
    elevated: 'bg-white dark:bg-[#2c2c2e] shadow-card-hover dark:shadow-card-hover-dark',
    flat: 'bg-[#fafafa] dark:bg-[#1c1c1e]',
  }

  const paddingClasses: Record<string, string> = {
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  )
}
