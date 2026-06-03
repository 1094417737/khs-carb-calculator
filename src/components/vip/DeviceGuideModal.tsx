import { useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

type Brand = 'coros' | 'garmin' | 'huawei' | 'apple' | 'suunto' | 'strava'

const BRANDS: { key: Brand; name: string; steps: string[] }[] = [
  {
    key: 'coros',
    name: '高驰 COROS',
    steps: ['打开 COROS APP → 选择已完成的运动记录', '点击右上角「分享」→ 选择「导出 FIT 文件」', '保存到手机「文件」App，回到本页面上传该文件'],
  },
  {
    key: 'garmin',
    name: '佳明 Garmin',
    steps: ['打开 Garmin Connect APP → 选择活动记录', '点击右上角 ⋯ →「导出」→「原始数据(.fit)」', '保存至手机文件，或通过 Garmin Connect 网页版下载'],
  },
  {
    key: 'huawei',
    name: '华为 HUAWEI',
    steps: ['打开华为运动健康 APP → 进入运动记录详情', '点击右上角分享按钮 →「导出轨迹(.gpx)」', '保存到手机「文件」App 或发送到微信后保存'],
  },
  {
    key: 'apple',
    name: 'Apple Watch',
    steps: ['打开 iPhone「健身」App → 选择目标训练', '使用第三方 App (如 HealthFit) 导出 .fit 文件', '或通过 Strava 同步 Apple Watch 训练后再导出'],
  },
  {
    key: 'suunto',
    name: 'Suunto',
    steps: ['打开 Suunto APP → 选择已完成的运动', '点击右上角分享 →「导出 FIT 文件」', '保存到手机文件系统，也可通过 movescount.com 下载'],
  },
  {
    key: 'strava',
    name: 'Strava',
    steps: ['打开 Strava APP 或网页 → 进入活动详情', '点击 ⋮ →「导出 GPX」', '如 APP 不支持导出，请使用 Strava 网页版 → 活动页 → 导出 GPX'],
  },
]

export default function DeviceGuideModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<Brand>('coros')
  if (!open) return null

  const active = BRANDS.find((b) => b.key === tab)!

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
          <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">设备数据导出指引</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#e8e8ed] dark:bg-[#2c2c2e] flex items-center justify-center text-sm">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 py-3 overflow-x-auto">
          {BRANDS.map((b) => (
            <button
              key={b.key}
              onClick={() => setTab(b.key)}
              className={`shrink-0 px-3 py-1.5 text-xs rounded-full transition-colors ${
                tab === b.key
                  ? 'bg-accent-500 text-white'
                  : 'bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b] dark:text-[#8e8e93]'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Steps */}
        <div className="px-5 py-4">
          <div className="text-sm font-medium text-[#1d1d1f] dark:text-white mb-3">{active.name} 导出步骤</div>
          <ol className="space-y-3">
            {active.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[#1d1d1f] dark:text-white">
                <span className="w-5 h-5 rounded-full bg-accent-500 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
