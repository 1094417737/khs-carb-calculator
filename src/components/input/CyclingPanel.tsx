import { useState, useEffect } from 'react'
import { useCalculator } from '../../hooks/useCalculator'
import type { DraftingLevel, WindLevel } from '../../types'
import Card from '../layout/Card'
import NumberInput from '../ui/NumberInput'
import Tooltip from '../ui/Tooltip'

const DRAFTING_OPTIONS: { value: DraftingLevel; label: string; desc: string; science: string }[] = [
  { value: 'solo', label: '破风', desc: '单飞/领骑，全程独自破风', science: '基准能耗。风阻消耗约80%功率输出 (Blocken 2018)' },
  { value: 'mixed', label: '混合', desc: '部分跟风，交替领骑', science: '~15% 能量节省 (Jeukendrup 2000)' },
  { value: 'drafting', label: '跟风', desc: '大集团或队友后方跟骑', science: '~27% 能量节省 (Blocken 2013 JAP)' },
]

const WIND_OPTIONS: { value: WindLevel; label: string; desc: string; fluidMod: string }[] = [
  { value: 'calm', label: '无风/微风', desc: '体感舒适，无明显风阻', fluidMod: '基准补水' },
  { value: 'moderate', label: '中等风', desc: '有持续风感，骑行需加力', fluidMod: '+10% 补水 (加速体表蒸发)' },
  { value: 'strong', label: '大风', desc: '强风/高速巡航，明显阻力', fluidMod: '+20% 补水 (高风速加速汗液蒸发)' },
]

export default function CyclingPanel() {
  const { planInputs, setPlanInput } = useCalculator()
  const [expanded, setExpanded] = useState(false)
  const enabled = planInputs.cyclingEnabled ?? false

  // 开关关闭时自动收起
  useEffect(() => {
    if (!enabled) setExpanded(false)
  }, [enabled])

  return (
    <Card padding="md" className="animate-slide-up">
      {/* 折叠标题 */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🚴</span>
          <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">
            骑行补液动态修正 (功率/风阻)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 开关：功率计模式 */}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={(e) => {
              e.stopPropagation()
              const next = !enabled
              setPlanInput('cyclingEnabled', next)
              if (next) {
                setExpanded(true)
                // 初始化默认值
                if (!planInputs.cyclingPowerWatts) setPlanInput('cyclingPowerWatts', 200)
                if (!planInputs.cyclingDrafting) setPlanInput('cyclingDrafting', 'solo')
                if (!planInputs.cyclingWind) setPlanInput('cyclingWind', 'calm')
              }
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
              enabled ? 'bg-accent-500' : 'bg-gray-200 dark:bg-[#48484a]'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 translate-y-[1.5px] ${enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
          </button>
          <svg
            className={`w-4 h-4 text-[#86868b] dark:text-[#8e8e93] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* 折叠内容 */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          expanded ? 'grid-rows-[1fr] mt-4' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 pt-1">
            {/* 提示 */}
            {!enabled && (
              <p className="text-xs text-[#aeaeb2] dark:text-[#636366]">
                开启功率计模式后，引擎将融合功率数据 (Watts × h × 3.6) 与心率算法，
                结合跟风与风速修正碳水及补水建议。理论基础: ACSM 2016 + Blocken 2018。
              </p>
            )}

            {/* 功率输入 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                  功率 (Watts)
                </span>
                <Tooltip content="骑行平均功率，来自功率计/智能骑行台。典型值: 休闲100-150W, 训练180-250W, 比赛250-350W" />
              </div>
              <NumberInput
                value={planInputs.cyclingPowerWatts ?? 200}
                onChange={(v) => setPlanInput('cyclingPowerWatts', v)}
                min={50}
                max={1500}
                step={10}
                unit="W"
              />
              <p className="text-[10px] text-[#aeaeb2] dark:text-[#636366] mt-1">
                NP/AP 均可，用于估算总机械功 (kJ) 与代谢消耗 (kcal)
              </p>
            </div>

            {/* 跟风程度 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">跟风程度</span>
                <Tooltip content="跟风可节省15-30%能量。破风=独自骑，跟风=集团/队友后方。" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DRAFTING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPlanInput('cyclingDrafting', opt.value)}
                    className={`p-2 rounded-xl text-center transition-all ${
                      (planInputs.cyclingDrafting ?? 'solo') === opt.value
                        ? 'bg-white dark:bg-[#2c2c2e] shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                        : 'bg-[#f5f5f7] dark:bg-[#1c1c1e]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#1d1d1f] dark:text-white">{opt.label}</div>
                    <div className="text-[10px] text-[#aeaeb2] dark:text-[#636366] mt-0.5 leading-tight">{opt.desc}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#aeaeb2] dark:text-[#636366] mt-1">
                {DRAFTING_OPTIONS.find(o => o.value === (planInputs.cyclingDrafting ?? 'solo'))!.science}
              </p>
            </div>

            {/* 风速感知 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">风速感知</span>
                <Tooltip content="风速加速汗液蒸发 (Saunders 2004)。大风天或高速巡航时补水需求增加。" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {WIND_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPlanInput('cyclingWind', opt.value)}
                    className={`p-2 rounded-xl text-center transition-all ${
                      (planInputs.cyclingWind ?? 'calm') === opt.value
                        ? 'bg-white dark:bg-[#2c2c2e] shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                        : 'bg-[#f5f5f7] dark:bg-[#1c1c1e]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#1d1d1f] dark:text-white">{opt.label}</div>
                    <div className="text-[10px] text-[#aeaeb2] dark:text-[#636366] mt-0.5 leading-tight">{opt.desc}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#aeaeb2] dark:text-[#636366] mt-1">
                {WIND_OPTIONS.find(o => o.value === (planInputs.cyclingWind ?? 'calm'))!.fluidMod}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
