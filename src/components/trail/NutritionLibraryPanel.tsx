import { useState } from 'react'
import { useTrail } from '../../hooks/useTrail'
import type { NutritionItem } from '../../types/trail'
import Card from '../layout/Card'

export default function NutritionLibraryPanel() {
  const { state, dispatch } = useTrail()
  const library = state.nutritionLibrary

  const [name, setName] = useState('')
  const [kcal, setKcal] = useState(111)
  const [sodium, setSodium] = useState(84)
  const [carbs, setCarbs] = useState(27)
  const [itemType, setItemType] = useState<NutritionItem['type']>('gel')

  function handleAdd() {
    if (!name.trim()) return
    dispatch({
      type: 'ADD_NUTRITION_ITEM',
      item: {
        id: `nut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: itemType,
        name: name.trim(),
        kcal,
        sodiumMg: sodium,
        carbsG: carbs,
        isActive: false, // reducer 会自动判定是否激活
      },
    })
    setName('')
  }

  function handleDelete(id: string) {
    dispatch({ type: 'DELETE_NUTRITION_ITEM', id })
  }

  const typeLabel: Record<string, string> = { gel: '能量胶', salt: '盐丸', solid: '固体' }

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎒</span>
        <span className="metric-label">自定义补给库 ({library.length})</span>
      </div>

      {/* 添加表单 — mobile: 2-row grid, desktop: single row */}
      <div className="mb-3 p-3 rounded-xl bg-[#f5f5f7] dark:bg-[#2c2c2e]">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 items-end">
          {/* 名称 — spans full on mobile */}
          <div className="col-span-2 sm:col-span-1">
            <label className="text-[10px] text-[#86868b] dark:text-[#8e8e93] block mb-0.5">名称</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder="如 GU Gel"
              className="w-full bg-white dark:bg-[#3a3a3c] rounded-lg px-2 h-10 text-sm text-[#1d1d1f] dark:text-white border border-transparent focus:border-accent-300 outline-none placeholder:text-[#aeaeb2]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#86868b] dark:text-[#8e8e93] block mb-0.5">kcal</label>
            <input
              type="number" inputMode="decimal" min={0} value={kcal}
              onChange={e => setKcal(Number(e.target.value))}
              className="w-full bg-white dark:bg-[#3a3a3c] rounded-lg px-1.5 h-10 text-sm text-[#1d1d1f] dark:text-white border border-transparent focus:border-accent-300 outline-none [appearance:textfield]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#86868b] dark:text-[#8e8e93] block mb-0.5">碳水g</label>
            <input
              type="number" inputMode="decimal" min={0} value={carbs}
              onChange={e => setCarbs(Number(e.target.value))}
              className="w-full bg-white dark:bg-[#3a3a3c] rounded-lg px-1.5 h-10 text-sm text-[#1d1d1f] dark:text-white border border-transparent focus:border-accent-300 outline-none [appearance:textfield]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#86868b] dark:text-[#8e8e93] block mb-0.5">钠mg</label>
            <input
              type="number" inputMode="decimal" min={0} value={sodium}
              onChange={e => setSodium(Number(e.target.value))}
              className="w-full bg-white dark:bg-[#3a3a3c] rounded-lg px-1.5 h-10 text-sm text-[#1d1d1f] dark:text-white border border-transparent focus:border-accent-300 outline-none [appearance:textfield]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#86868b] dark:text-[#8e8e93] block mb-0.5">类型</label>
            <select
              value={itemType} onChange={e => setItemType(e.target.value as NutritionItem['type'])}
              className="w-full bg-white dark:bg-[#3a3a3c] rounded-lg px-1 h-10 text-sm text-[#1d1d1f] dark:text-white border border-transparent focus:border-accent-300 outline-none"
            >
              <option value="gel">胶</option>
              <option value="salt">盐丸</option>
              <option value="solid">固体</option>
            </select>
          </div>
        </div>
        <button
          type="button" onClick={handleAdd}
          disabled={!name.trim()}
          className="mt-2 sm:mt-0 sm:hidden w-full h-10 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-40 transition-colors"
        >
          + 添加
        </button>
        {/* Desktop add button */}
        <button
          type="button" onClick={handleAdd}
          disabled={!name.trim()}
          className="hidden sm:inline-flex mt-2 w-full h-10 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-40 transition-colors items-center justify-center"
        >
          + 添加
        </button>
      </div>

      {/* 补给列表 */}
      {library.length === 0 ? (
        <p className="text-xs text-[#aeaeb2] py-2">还没有补给品，请在上方添加</p>
      ) : (
        <div className="space-y-1">
          {library.map(item => (
            <div key={item.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#f5f5f7] dark:bg-[#2c2c2e]">
              {/* 激活单选按钮 */}
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_ITEM_ACTIVE', id: item.id })}
                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  item.isActive
                    ? 'border-accent-500 bg-accent-500'
                    : 'border-[#c6c6c8] dark:border-[#636366] hover:border-accent-400'
                }`}
              >
                {item.isActive && <span className="w-2 h-2 rounded-full bg-white" />}
              </button>
              <span className="text-base shrink-0">
                {item.type === 'gel' ? '⚡' : item.type === 'salt' ? '💧' : '🍫'}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">{item.name}</span>
                <span className="text-[11px] text-[#aeaeb2] ml-2">{typeLabel[item.type]}</span>
                {item.isActive && (
                  <span className="text-[10px] text-accent-500 ml-1 font-medium">已激活</span>
                )}
              </div>
              <span className="text-[11px] text-[#86868b] font-mono hidden sm:inline">{item.kcal}kcal</span>
              <span className="text-[11px] text-[#86868b] font-mono hidden sm:inline">{item.carbsG}g</span>
              <span className="text-[11px] text-[#86868b] font-mono">{item.sodiumMg}mg</span>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="min-w-[32px] min-h-[32px] rounded-full bg-[#e8e8ed] dark:bg-[#3a3a3c] flex items-center justify-center text-sm text-[#86868b] hover:bg-red-100 hover:text-red-500 transition-colors shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 说明文案 */}
      <p className="mt-3 text-[11px] leading-relaxed text-[#aeaeb2] dark:text-[#636366]">
        💡 提示：同类型物品中，系统将以您勾选的激活项作为全局路线的补给计算基准。
      </p>
    </Card>
  )
}