import type { TrackPoint, Waypoint, CustomMarker } from '../../types/trail'

function xmlSafe(s: string): string {
  return s
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * 强制 ASCII 短名映射 — 杜绝手表中文乱码
 *
 * GEL  → GEL
 * SALT → SALT
 * 混合 → GEL+SALT
 */
export function safeEnglishName(wp: Waypoint): string {
  const hasGel = wp.items.some(i => i.type === 'gel')
  const hasSalt = wp.items.some(i => i.type === 'salt')

  if (hasGel && hasSalt) return 'GEL+SALT'
  if (hasGel) return 'GEL'
  if (hasSalt) return 'SALT'
  return 'WP'
}

/**
 * GPX <sym> 标准标签 — 触发手表图标渲染
 *
 * GEL       → Food
 * SALT      → Water
 * GEL+SALT  → Food
 */
function waypointSym(wp: Waypoint): string {
  const hasGel = wp.items.some(i => i.type === 'gel')
  const hasSalt = wp.items.some(i => i.type === 'salt')

  if (hasGel && hasSalt) return 'Food'
  if (hasGel) return 'Food'
  if (hasSalt) return 'Water'
  return 'Waypoint'
}

export function generateGpxWithWaypoints(
  trackPoints: TrackPoint[],
  waypoints: Waypoint[],
  safeMode: boolean = false,
  customMarkers?: CustomMarker[]
): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="TrailFuelPlanner"',
    '  xmlns="http://www.topografix.com/GPX/1/1"',
    '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">',
    '  <trk><name>Trail Nutrition Plan</name><trkseg>',
  ]

  for (const pt of trackPoints) {
    lines.push(`      <trkpt lat="${pt.lat}" lon="${pt.lon}"><ele>${pt.ele}</ele></trkpt>`)
  }

  lines.push('    </trkseg></trk>')

  for (const wp of waypoints) {
    // name: 始终使用 ASCII 短名，杜绝乱码
    const name = safeEnglishName(wp)
    // desc: 安全模式下用英文，否则保留中文供参考
    const desc = safeMode
      ? wp.items.map(i => `${safeEnglishName(wp)} x${i.quantity}`).join(', ')
      : wp.items.map(i => `${i.itemName} x${i.quantity}`).join(', ')

    lines.push(
      `  <wpt lat="${wp.lat}" lon="${wp.lon}">`,
      `    <name>${xmlSafe(name)}</name>`,
      `    <desc>${xmlSafe(`${desc} · ${wp.distanceKm.toFixed(1)}km`)}</desc>`,
      `    <sym>${waypointSym(wp)}</sym>`,
      `    <type>Nutrition</type>`,
      `  </wpt>`
    )
  }

  // Custom user markers — never interfere with nutrition waypoints
  if (customMarkers && customMarkers.length > 0) {
    for (let i = 0; i < customMarkers.length; i++) {
      const cm = customMarkers[i]
      const name = safeMode ? safeCustomName(cm, i) : cm.name
      lines.push(
        `  <wpt lat="${cm.lat}" lon="${cm.lon}">`,
        `    <name>${xmlSafe(name)}</name>`,
        `    <desc>${xmlSafe(cm.name)}</desc>`,
        `    <sym>Flag</sym>`,
        `    <type>User Waypoint</type>`,
        `  </wpt>`
      )
    }
  }

  lines.push('</gpx>')
  return lines.join('\n')
}

const CUSTOM_KEYWORD_MAP: [string[], string][] = [
  // Priority 1: 赛道节点类 — CP/AS 最高优先，避免被 WATER/FOOD 误吞
  [['cp', '打卡'], 'CP'],
  [['sp', '补给站', '站'], 'AS'],
  [['起点', '出发'], 'START'],
  [['终点', '冲线'], 'FINISH'],
  // Priority 2: 战术与装备类
  [['包', '换装', '存包'], 'BAG'],
  [['杖', '棍', '帐', '拿', '收'], 'POLES'],
  // Priority 3: 补给与生存类
  [['水', '泉', '河'], 'WATER'],
  [['食', '饭', '店', '吃'], 'FOOD'],
  [['医', '救', '药'], 'MEDIC'],
  [['厕', '洗手'], 'WC'],
  // Priority 4: 地形与预警类
  [['险', '崖', '滑', '注意', '慢'], 'DANGER'],
  [['顶', '峰', '山头', '垭口'], 'PEAK'],
  [['桥'], 'BRIDGE'],
  [['路口', '岔', '拐'], 'TURN'],
  [['风景', '拍照', '观景'], 'VIEW'],
]

function safeCustomName(cm: CustomMarker, index: number): string {
  const name = cm.name
  const lower = name.toLowerCase()
  const digits = name.match(/\d+/)

  for (const [keywords, label] of CUSTOM_KEYWORD_MAP) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return digits ? `${label}-${digits[0]}` : label
    }
  }

  // Fallback: 纯 ASCII 则转大写；含中文则通用编号
  if (/^[\x00-\x7F]+$/.test(name)) return name.toUpperCase()
  return `WPT-${index + 1}`
}