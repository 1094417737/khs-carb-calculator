import React, { useState, useEffect } from 'react'
import { useCalculator } from '../../hooks/useCalculator'
import Card from '../layout/Card'
import { SALT_PER_SODIUM } from '../../data/constants'

const CONTAINER_PRESETS = [200, 250, 500, 750, 1000]

export default function HomemadeMixView() {
  const { results, strategyOptions, planInputs } = useCalculator()
  const mix = results?.homemadeMix
  const sodium = results?.sodium
  const [containerMl, setContainerMl] = useState(500)
  const [containerText, setContainerText] = useState(String(500))

  useEffect(() => { setContainerText(String(containerMl)) }, [containerMl])
  if (!mix) return null

  const saltPerHour = Math.round((sodium?.mgPerHour.recommended ?? 0) * SALT_PER_SODIUM / 1000 * 10) / 10
  const saltTotal = Math.round((sodium?.totalMg ?? 0) * SALT_PER_SODIUM / 1000 * 10) / 10

  const hours = planInputs.durationMinutes / 60

  // 容器计算
  const concDecimal = mix.concentration / 100
  const sugarPerContainer = Math.round(containerMl * concDecimal)
  const glucosePerContainer = Math.round(sugarPerContainer * (mix.glucosePerHour / mix.totalSugarPerHour))
  const fructosePerContainer = sugarPerContainer - glucosePerContainer
  const saltPerContainer = mix.waterMlPerHour > 0
    ? Math.round(saltPerHour * containerMl / mix.waterMlPerHour * 10) / 10
    : 0
  const containersPerHour = mix.waterMlPerHour > 0
    ? Math.round(containerMl / (mix.waterMlPerHour / (60 / 30)) * 10) / 10  // how many min per container
    : 0
  // 每小时几瓶 / 每瓶管多久
  const perHourNum = mix.waterMlPerHour > 0 ? mix.waterMlPerHour / containerMl : 0
  const perHourLabel = perHourNum >= 1
    ? `每小时约需 ${perHourNum.toFixed(1)} 瓶`
    : perHourNum > 0
    ? `每 ${Math.round(60 / perHourNum)} 分钟喝 1 瓶`
    : ''

  const ratioLabel: Record<string, string> = {
    '2:1': '葡萄糖 2 : 果糖 1',
    '1:1': '葡萄糖 1 : 果糖 1',
    '1:0.8': '葡萄糖 1 : 果糖 0.8',
  }

  const ceilingInfo: Record<string, string> = {
    '2:1': '单转运蛋白为主 · 吸收上限 ~60g/h',
    '1:1': '双通道全开 (SGLT1+GLUT5) · 吸收上限 ~90g/h',
    '1:0.8': '接近双通道 · 吸收上限 ~80g/h',
  }

  // 替代原料提示
  const sugarTips: Record<string, string> = {
    '2:1': '葡萄糖可用麦芽糊精替代（低甜度），果糖保持',
    '1:1': '可直接用普通白砂糖（蔗糖=1:1葡萄糖果糖），无需分开购买',
    '1:0.8': '葡萄糖可用麦芽糊精替代（低甜度），果糖保持',
  }

  // 成本估算 (葡萄糖~15元/kg, 果糖~20元/kg, 白砂糖~8元/kg, 海盐~10元/kg)
  const getSugarCost = () => {
    const ratio = strategyOptions.homemadeRatio
    if (ratio === '1:1') {
      // 直接用白砂糖 ~8元/kg
      return { perHour: (mix.totalSugarPerHour / 1000 * 8), perEvent: (mix.totalSugarTotal / 1000 * 8), label: '白砂糖' }
    }
    // 葡萄糖~15元/kg + 果糖~20元/kg
    const gCost = mix.glucoseTotal / 1000 * 15
    const fCost = mix.fructoseTotal / 1000 * 20
    return { perHour: ((mix.glucosePerHour / 1000 * 15) + (mix.fructosePerHour / 1000 * 20)), perEvent: gCost + fCost, label: '葡萄糖+果糖' }
  }

  const sugarCost = getSugarCost()
  const saltCost = (saltTotal / 1000) * 10 // 海盐 ~10元/kg
  const totalHomemadeCost = sugarCost.perEvent + saltCost

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg"></span>
        <span className="metric-label">自制补给配方</span>
        <span className="text-[11px] text-accent-600 dark:text-accent-400 font-medium">
          {ratioLabel[strategyOptions.homemadeRatio]}
        </span>
      </div>
      <p className="text-[10px] text-[#aeaeb2] dark:text-[#636366] mb-3">
        {ceilingInfo[strategyOptions.homemadeRatio]}
      </p>

      {/* 糖 + 水 + 盐 每小时 */}
      {strategyOptions.homemadeRatio === '1:1' ? (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl p-3 text-center">
            <div className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mb-0.5">白砂糖 /h</div>
            <div className="text-lg font-bold text-[#1d1d1f] dark:text-white">{mix.totalSugarPerHour}<span className="text-xs text-[#86868b] dark:text-[#8e8e93] ml-0.5">g</span></div>
            <div className="text-[10px] text-[#aeaeb2] dark:text-[#636366] mt-0.5">蔗糖 = 1:1</div>
          </div>
          <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl p-3 text-center">
            <div className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mb-0.5">水 /h</div>
            <div className="text-lg font-bold text-[#1d1d1f] dark:text-white">{mix.waterMlPerHour}<span className="text-xs text-[#86868b] dark:text-[#8e8e93] ml-0.5">ml</span></div>
          </div>
          <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl p-3 text-center">
            <div className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mb-0.5">海盐 /h</div>
            <div className="text-lg font-bold text-[#1d1d1f] dark:text-white">{saltPerHour}<span className="text-xs text-[#86868b] dark:text-[#8e8e93] ml-0.5">g</span></div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl p-3 text-center">
            <div className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mb-0.5">葡萄糖 /h</div>
            <div className="text-lg font-bold text-[#1d1d1f] dark:text-white">{mix.glucosePerHour}<span className="text-xs text-[#86868b] dark:text-[#8e8e93] ml-0.5">g</span></div>
          </div>
          <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl p-3 text-center">
            <div className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mb-0.5">果糖 /h</div>
            <div className="text-lg font-bold text-[#1d1d1f] dark:text-white">{mix.fructosePerHour}<span className="text-xs text-[#86868b] dark:text-[#8e8e93] ml-0.5">g</span></div>
          </div>
          <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl p-3 text-center">
            <div className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mb-0.5">水 /h</div>
            <div className="text-lg font-bold text-[#1d1d1f] dark:text-white">{mix.waterMlPerHour}<span className="text-xs text-[#86868b] dark:text-[#8e8e93] ml-0.5">ml</span></div>
          </div>
          <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl p-3 text-center">
            <div className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mb-0.5">海盐 /h</div>
            <div className="text-lg font-bold text-[#1d1d1f] dark:text-white">{saltPerHour}<span className="text-xs text-[#86868b] dark:text-[#8e8e93] ml-0.5">g</span></div>
          </div>
        </div>
      )}

      {/* 容器计算器 */}
      <div className="bg-[#e8e8ed] dark:bg-[#1d1d1f] rounded-2xl p-4 mb-3">
        <div className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mb-3">装入你的水壶/软水壶</div>

        {/* 容器大小选择 */}
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              const step = containerMl > 1000 ? 200 : 50
              setContainerMl(Math.max(200, containerMl - step))
            }}
            className="w-8 h-8 rounded-lg bg-white dark:bg-[#2c2c2e] flex items-center justify-center text-[#1d1d1f] dark:text-white text-sm hover:bg-[#dcdce2] dark:hover:bg-[#3a3a3c] transition-colors"
          >−</button>
          <div className="flex-1 flex items-center justify-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={containerText}
              onChange={(e) => setContainerText(e.target.value)}
              onBlur={() => {
                const v = Number(containerText)
                if (isNaN(v) || containerText === '') {
                  setContainerText(String(containerMl))
                  return
                }
                const clamped = Math.min(6000, Math.max(200, Math.round(v)))
                setContainerMl(clamped)
                setContainerText(String(clamped))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = Number(containerText)
                  if (isNaN(v) || containerText === '') {
                    setContainerText(String(containerMl))
                    return
                  }
                  const clamped = Math.min(6000, Math.max(200, Math.round(v)))
                  setContainerMl(clamped)
                  setContainerText(String(clamped))
                }
              }}
              onFocus={(e) => e.target.select()}
              className="w-20 bg-transparent text-center text-2xl font-bold text-[#1d1d1f] dark:text-white outline-none"
            />
            <span className="text-sm text-[#86868b] dark:text-[#8e8e93]">ml</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const step = containerMl > 1000 ? 200 : 50
              setContainerMl(Math.min(6000, containerMl + step))
            }}
            className="w-8 h-8 rounded-lg bg-white dark:bg-[#2c2c2e] flex items-center justify-center text-[#1d1d1f] dark:text-white text-sm hover:bg-[#dcdce2] dark:hover:bg-[#3a3a3c] transition-colors"
          >+</button>
        </div>

        {/* 快速选择 */}
        <div className="flex gap-1.5 mb-3">
          {CONTAINER_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setContainerMl(preset)}
              className={`px-2.5 py-1 text-[11px] rounded-lg transition-all ${
                containerMl === preset
                  ? 'bg-accent-500 text-white'
                  : 'bg-white dark:bg-[#2c2c2e] text-[#86868b] dark:text-[#8e8e93] hover:bg-[#dcdce2] dark:hover:bg-[#3a3a3c]'
              }`}
            >
              {preset}ml
            </button>
          ))}
        </div>

        {/* 每瓶配料 */}
        {strategyOptions.homemadeRatio === '1:1' ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white dark:bg-[#2c2c2e] rounded-xl p-3 text-center">
              <div className="text-[10px] text-[#86868b] dark:text-[#8e8e93] mb-0.5">白砂糖</div>
              <div className="text-xl font-bold text-[#1d1d1f] dark:text-white">{sugarPerContainer}<span className="text-xs text-[#86868b] dark:text-[#8e8e93] ml-0.5">g</span></div>
              <div className="text-[10px] text-[#aeaeb2] dark:text-[#636366] mt-0.5">超市普通白砂糖</div>
            </div>
            <div className="bg-white dark:bg-[#2c2c2e] rounded-xl p-3 text-center">
              <div className="text-[10px] text-[#86868b] dark:text-[#8e8e93] mb-0.5">海盐</div>
              <div className="text-xl font-bold text-[#1d1d1f] dark:text-white">{saltPerContainer}<span className="text-xs text-[#86868b] dark:text-[#8e8e93] ml-0.5">g</span></div>
              <div className="text-[10px] text-[#aeaeb2] dark:text-[#636366] mt-0.5">天然海盐</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="bg-white dark:bg-[#2c2c2e] rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-[#86868b] dark:text-[#8e8e93] mb-0.5">葡萄糖</div>
              <div className="text-lg font-bold text-[#1d1d1f] dark:text-white">{glucosePerContainer}<span className="text-xs text-[#86868b] dark:text-[#8e8e93] ml-0.5">g</span></div>
            </div>
            <div className="bg-white dark:bg-[#2c2c2e] rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-[#86868b] dark:text-[#8e8e93] mb-0.5">果糖</div>
              <div className="text-lg font-bold text-[#1d1d1f] dark:text-white">{fructosePerContainer}<span className="text-xs text-[#86868b] dark:text-[#8e8e93] ml-0.5">g</span></div>
            </div>
            <div className="bg-white dark:bg-[#2c2c2e] rounded-xl p-2.5 text-center sm:col-span-1 col-span-2">
              <div className="text-[10px] text-[#86868b] dark:text-[#8e8e93] mb-0.5">海盐</div>
              <div className="text-lg font-bold text-[#1d1d1f] dark:text-white">{saltPerContainer}<span className="text-xs text-[#86868b] dark:text-[#8e8e93] ml-0.5">g</span></div>
            </div>
          </div>
        )}

        {/* 每小时需要几瓶 */}
        <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mt-2 text-center">
          {perHourLabel}<span className="text-[#8e8e93]">（{containerMl}ml/瓶）</span>
        </p>
      </div>

      {/* 关键提示: 白砂糖可替代 */}
      <div className="px-3 py-2 rounded-xl bg-[#fff8e1] dark:bg-[#3a2e00] mb-2">
        <p className="text-[11px] text-[#795548] dark:text-[#ffd54f] leading-relaxed">
          {sugarTips[strategyOptions.homemadeRatio]}
        </p>
      </div>

      {/* 总计 */}
      <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl p-3 mb-2">
        <div className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mb-1">全程总计</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#1d1d1f] dark:text-white">
          {strategyOptions.homemadeRatio === '1:1' ? (
            <span>白砂糖 <strong>{mix.totalSugarTotal}g</strong></span>
          ) : (
            <>
              <span>葡萄糖 <strong>{mix.glucoseTotal}g</strong></span>
              <span>果糖 <strong>{mix.fructoseTotal}g</strong></span>
            </>
          )}
          <span>水 <strong>{mix.waterMlTotal}ml</strong> ({(mix.waterMlTotal / 1000).toFixed(1)}L)</span>
          <span>海盐 <strong>{saltTotal}g</strong></span>
        </div>
      </div>

      {/* 成本对比 */}
      <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl p-3 mb-2">
        <div className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mb-1">预估成本</div>
        <div className="text-xs text-[#1d1d1f] dark:text-white space-y-0.5">
          <div className="flex justify-between">
            <span>{sugarCost.label} ({sugarCost.perHour.toFixed(1)}元/h)</span>
            <strong>¥{sugarCost.perEvent.toFixed(1)}</strong>
          </div>
          <div className="flex justify-between">
            <span>海盐</span>
            <strong>¥{saltCost.toFixed(1)}</strong>
          </div>
          <div className="flex justify-between border-t border-black/5 dark:border-white/10 pt-1 mt-1">
            <span>自制总成本 ({hours.toFixed(1)}h)</span>
            <strong className="text-emerald-500 dark:text-emerald-400">¥{totalHomemadeCost.toFixed(1)}</strong>
          </div>
        </div>
      </div>

      {/* 赛前准备清单 */}
      <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl p-3 mb-2">
        <div className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mb-2">赛前准备</div>
        <div className="space-y-1 text-[11px] text-[#1d1d1f] dark:text-white">
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 shrink-0">1</span>
            <span>{sugarCost.label} <strong>{mix.totalSugarTotal}g</strong>{strategyOptions.homemadeRatio === '1:1' ? '（超市普通白砂糖即可）' : '（网购葡萄糖+果糖分装）'}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 shrink-0">2</span>
            <span>天然海盐 <strong>{saltTotal}g</strong>（非精制盐，含微量元素）</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 shrink-0">3</span>
            <span>水 <strong>{mix.waterMlTotal}ml</strong> ({(mix.waterMlTotal / 1000).toFixed(1)}L){/* 咖啡因策略已全局隐藏 */}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 shrink-0">4</span>
            <span>混合装入软水壶或水瓶，按时间表每30分钟饮用</span>
          </div>
        </div>
      </div>

      {/* 核心原理 */}
      <div className="px-3 py-2 rounded-xl bg-[#e8f5e9] dark:bg-[#1a3a1e]">
        <p className="text-[11px] text-[#2e7d32] dark:text-[#4caf50] leading-relaxed">
          核心配方：糖 + 海盐 + 水。大多数商业运动补给本质上就是葡萄糖+果糖+电解质，自制成本仅为商业产品的5-10%。
        </p>
      </div>

      <p className="text-[11px] text-[#aeaeb2] dark:text-[#636366] leading-relaxed">
        {mix.explanation}浓度{mix.concentration}%适配当前GI训练水平。
      </p>
    </Card>
  )
}
