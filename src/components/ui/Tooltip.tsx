import { useState } from 'react'

interface TooltipProps {
  content: string
}

export default function Tooltip({ content }: TooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setShow(!show)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-4 h-4 rounded-full bg-[#e8e8ed] dark:bg-[#2c2c2e] flex items-center justify-center text-[10px] text-[#86868b] dark:text-[#8e8e93] hover:bg-[#dcdce2] dark:hover:bg-[#3a3a3c] transition-colors cursor-help"
      >
        ?
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-[#1d1d1f] dark:bg-[#2c2c2e] text-white dark:text-[#f2f2f7] text-xs rounded-xl shadow-lg z-10 animate-fade-in">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1d1d1f] dark:border-t-[#2c2c2e]" />
        </span>
      )}
    </span>
  )
}
