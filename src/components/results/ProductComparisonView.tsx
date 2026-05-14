import { useCalculator } from '../../hooks/useCalculator'
import Card from '../layout/Card'

export default function ProductComparisonView() {
  const { results } = useCalculator()
  const pc = results?.productComparison
  if (!pc) return null

  const showGel = !!pc.selectedGelLabel
  const showDrink = !!pc.selectedDrinkLabel

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <span className="metric-label">产品对比</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-black/5 dark:border-white/8">
              <th className="text-left py-2 font-medium text-[#86868b] dark:text-[#8e8e93]">项目</th>
              <th className="text-right py-2 font-medium text-[#86868b] dark:text-[#8e8e93]">目标</th>
              <th className="text-right py-2 font-medium text-[#86868b] dark:text-[#8e8e93]">产品提供</th>
              <th className="text-right py-2 font-medium text-[#86868b] dark:text-[#8e8e93]">差额</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black/5 dark:border-white/5">
              <td className="py-2 text-[#1d1d1f] dark:text-white">碳水</td>
              <td className="text-right py-2 text-[#1d1d1f] dark:text-white">
                {results!.carbs.totalGrams}g
              </td>
              <td className="text-right py-2 text-[#1d1d1f] dark:text-white">
                {pc.totalCarbsFromProducts}g
              </td>
              <td className={`text-right py-2 font-medium ${
                pc.carbShortfall > 0
                  ? 'text-[#ff9500] dark:text-[#ff9f0a]'
                  : 'text-[#34c759] dark:text-[#30d158]'
              }`}>
                {pc.carbShortfall > 0 ? `差${pc.carbShortfall}g` : pc.carbShortfall < 0 ? `+${-pc.carbShortfall}g` : '刚好'}
              </td>
            </tr>
            <tr className="border-b border-black/5 dark:border-white/5">
              <td className="py-2 text-[#1d1d1f] dark:text-white">钠</td>
              <td className="text-right py-2 text-[#1d1d1f] dark:text-white">
                {results!.sodium.totalMg}mg
              </td>
              <td className="text-right py-2 text-[#1d1d1f] dark:text-white">
                {pc.totalSodiumFromProducts}mg
              </td>
              <td className={`text-right py-2 font-medium ${
                pc.sodiumShortfall > 0
                  ? 'text-[#ff9500] dark:text-[#ff9f0a]'
                  : 'text-[#34c759] dark:text-[#30d158]'
              }`}>
                {pc.sodiumShortfall > 0 ? `差${pc.sodiumShortfall}mg` : pc.sodiumShortfall < 0 ? `+${-pc.sodiumShortfall}mg` : '刚好'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/8 space-y-1">
        {showGel && (
          <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93]">
            {pc.selectedGelLabel}: 需要 <strong className="text-[#1d1d1f] dark:text-white">{pc.totalGelsNeeded}</strong> 支
          </p>
        )}
        {showDrink && (
          <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93]">
            {pc.selectedDrinkLabel}: 需要 <strong className="text-[#1d1d1f] dark:text-white">{pc.totalDrinkServingsNeeded}</strong> 份
          </p>
        )}
        {pc.totalCost !== undefined && (
          <p className="text-[11px] text-[#1d1d1f] dark:text-white font-medium">
            预估费用: ¥{pc.totalCost}
          </p>
        )}
      </div>
    </Card>
  )
}
