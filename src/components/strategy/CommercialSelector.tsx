import { useState } from 'react'
import { useCalculator } from '../../hooks/useCalculator'
import { gelProducts } from '../../data/gels'
import { drinkProducts } from '../../data/drinks'
import Select from '../ui/Select'

type RegionFilter = 'ALL' | 'CN' | 'INTL'

export default function CommercialSelector() {
  const { strategyOptions, setStrategyOption } = useCalculator()
  const [gelRegion, setGelRegion] = useState<RegionFilter>('ALL')
  const [drinkRegion, setDrinkRegion] = useState<RegionFilter>('ALL')

  // 咖啡因开启时：含咖啡因的排前面；关闭时：全部显示
  const sortedGels = strategyOptions.useCaffeine
    ? [...gelProducts].sort((a, b) => (b.isCaffeinated ? 1 : 0) - (a.isCaffeinated ? 1 : 0))
    : gelProducts

  const gelOptions = sortedGels
    .filter((g) => gelRegion === 'ALL' || g.region === gelRegion)
    .map((g) => ({
      value: g.id,
      label: `${g.brand} ${g.name}`,
      subtitle: `${g.carbsPerServing}g 碳水 | ${g.sodiumPerServing}mg 钠${g.isCaffeinated ? ` | ${g.caffeinePerServing}mg 咖啡因` : ''}${g.priceCNY ? ` | ¥${g.priceCNY}` : ''}`,
    }))

  const drinkOptions = drinkProducts
    .filter((d) => drinkRegion === 'ALL' || d.region === drinkRegion)
    .map((d) => ({
      value: d.id,
      label: `${d.brand} ${d.name}`,
      subtitle: `${d.carbsPerServing}g 碳水 | ${d.sodiumPerServing}mg 钠 | ${d.servingWaterMl}ml 水${d.priceCNY ? ` | ¥${d.priceCNY}` : ''}`,
    }))

  const selectedGel = gelProducts.find((g) => g.id === strategyOptions.selectedCommercialGel)
  const selectedDrink = drinkProducts.find((d) => d.id === strategyOptions.selectedCommercialDrink)

  const regionTabs: { value: RegionFilter; label: string }[] = [
    { value: 'ALL', label: '全部' },
    { value: 'CN', label: '国产' },
    { value: 'INTL', label: '国际' },
  ]

  return (
    <div className="space-y-4">
      {/* 能量胶选择 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">能量胶</span>
          <div className="flex gap-0.5">
            {regionTabs.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setGelRegion(t.value)}
                className={`px-2 py-0.5 text-[11px] rounded-md transition-colors ${
                  gelRegion === t.value
                    ? 'bg-accent-500 text-white'
                    : 'text-[#86868b] dark:text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <Select
          options={gelOptions}
          value={strategyOptions.selectedCommercialGel ?? ''}
          onChange={(v) => setStrategyOption('selectedCommercialGel', v)}
          placeholder="选择能量胶品牌"
        />
        {selectedGel && (
          <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mt-1">
            每支: {selectedGel.carbsPerServing}g 碳水
            {selectedGel.sodiumPerServing > 0 && ` | ${selectedGel.sodiumPerServing}mg 钠`}
            {selectedGel.withWater && ' | 需配合水服用'}
          </p>
        )}
      </div>

      {/* 运动饮料选择 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">运动饮料</span>
          <div className="flex gap-0.5">
            {regionTabs.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setDrinkRegion(t.value)}
                className={`px-2 py-0.5 text-[11px] rounded-md transition-colors ${
                  drinkRegion === t.value
                    ? 'bg-accent-500 text-white'
                    : 'text-[#86868b] dark:text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <Select
          options={drinkOptions}
          value={strategyOptions.selectedCommercialDrink ?? ''}
          onChange={(v) => setStrategyOption('selectedCommercialDrink', v)}
          placeholder="选择运动饮料品牌"
        />
        {selectedDrink && (
          <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mt-1">
            每份 ({selectedDrink.servingSizeGrams}g + {selectedDrink.servingWaterMl}ml 水):
            {selectedDrink.carbsPerServing}g 碳水 | {selectedDrink.sodiumPerServing}mg 钠
            {selectedDrink.isIsotonic && ' | 等渗配方'}
          </p>
        )}
      </div>
    </div>
  )
}
