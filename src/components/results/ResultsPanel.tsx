import { useState } from 'react'
import { useCalculator } from '../../hooks/useCalculator'
import Card from '../layout/Card'
import CarbResultView from './CarbResultView'
import FluidResultView from './FluidResultView'
import SodiumResultView from './SodiumResultView'
import CaffeinePlanView from './CaffeinePlanView'
import FeedingScheduleView from './FeedingScheduleView'
import ProductComparisonView from './ProductComparisonView'
import HomemadeMixView from './HomemadeMixView'
import { generateShareText, copyToClipboard } from '../../utils/share'

export default function ResultsPanel() {
  const { results, planInputs, strategyOptions } = useCalculator()
  const [copied, setCopied] = useState(false)
  if (!results) return null

  const handleCopy = async () => {
    const text = generateShareText(planInputs, strategyOptions, results)
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="section-title mb-0">补给方案</h2>
        <button
          type="button"
          onClick={handleCopy}
          className="h-8 px-3 rounded-lg text-xs font-medium bg-accent-500 text-white hover:bg-accent-600 transition-colors"
        >
          {copied ? '已复制' : '复制方案'}
        </button>
      </div>

      {/* 警告 */}
      {results.warnings.length > 0 && (
        <Card padding="md" className="!bg-[#fff3cd] dark:!bg-[#3a2e00] !shadow-none">
          {results.warnings.map((w, i) => (
            <p key={i} className="text-xs text-[#856404] dark:text-[#ffd60a]">
              ⚠ {w}
            </p>
          ))}
        </Card>
      )}

      {/* 核心指标网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CarbResultView />
        <FluidResultView />
        <SodiumResultView />
      </div>

      {/* 产品对比 (商业) 或 自制配方 */}
      <ProductComparisonView />
      <HomemadeMixView />

      {/* 咖啡因方案 */}
      <CaffeinePlanView />

      {/* 补给时间表 */}
      <FeedingScheduleView />
    </div>
  )
}
