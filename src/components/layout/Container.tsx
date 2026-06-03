import { ReactNode } from 'react'

interface ContainerProps {
  children: ReactNode
  className?: string
}

export default function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`max-w-[880px] mx-auto px-3 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  )
}
