import { useTheme } from '../../hooks/useTheme'
import { useCalculator } from '../../hooks/useCalculator'

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const { reset } = useCalculator()

  return (
    <header className="sticky top-0 z-50 bg-[#f2f2f7]/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10">
      <div className="max-w-[880px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white leading-none">
              KHS耐力补碳计算器
            </h1>
            <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93] leading-none mt-0.5 hidden sm:block">
              基于运动科学的个性化补给方案
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="h-8 px-3 rounded-lg text-xs font-medium text-[#86868b] dark:text-[#8e8e93] bg-[#e8e8ed] dark:bg-[#2c2c2e] hover:bg-[#dcdce2] dark:hover:bg-[#3a3a3c] transition-colors"
          >
            重置
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl bg-[#e8e8ed] dark:bg-[#2c2c2e] flex items-center justify-center text-base hover:scale-105 transition-transform"
            aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          >
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  )
}
