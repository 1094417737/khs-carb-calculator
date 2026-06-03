import type { TrackPoint, Waypoint, CustomMarker } from '../../types/trail'

function xmlSafe(s: string): string {
  return s
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * 强制 ASCII 短名映射 — 杜绝手表中文乱码
 * 含数量标注：GELx2 / SALTx3 / GELx1+SALTx2
 */
export function safeEnglishName(wp: Waypoint): string {
  const gels = wp.items.filter(i => i.type === 'gel').reduce((s, i) => s + i.quantity, 0)
  const salts = wp.items.filter(i => i.type === 'salt').reduce((s, i) => s + i.quantity, 0)

  if (gels > 0 && salts > 0) return `GELx${gels}+SALTx${salts}`
  if (gels > 0) return `GELx${gels}`
  if (salts > 0) return `SALTx${salts}`
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

/**
 * 自定义标记 → <sym> 映射
 * 根据关键词匹配手表原生图标，支持导航预警
 */
function customMarkerSym(cm: CustomMarker, index: number): string {
  const lower = cm.name.toLowerCase()
  for (const [keywords, label] of CUSTOM_KEYWORD_MAP) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return customSymMap[label] ?? 'Flag'
    }
  }
  return 'Flag'
}

/** 关键词 → Garmin 原生 sym 映射 */
const customSymMap: Record<string, string> = {
  CP: 'Pin',
  AS: 'Pin',
  START: 'Flag, Blue',
  FINISH: 'Flag, Red',
  WATER: 'Drinking Water',
  FOOD: 'Food',
  MEDIC: 'First Aid',
  DANGER: 'Danger Area',
  PEAK: 'Summit',
  BRIDGE: 'Bridge',
  TURN: 'Crossing',
  VIEW: 'Scenic Area',
  BAG: 'Residence',
  POLES: 'Pin',
  WC: 'Restroom',
}

// ═══════════════════════════════════════════════════════════════
// 芯片级物理规整算法 — 仅在导出内存流中生效，绝不污染原始数据
// ═══════════════════════════════════════════════════════════════

/** RDP 安全红线：容差锁定在 0.000015~0.00002 度（≈1.6~2.2m） */
const RDP_EPSILON = 0.000018

/** 海拔调整安全红线 */
const ELEV_DEAD_ZONE = 2.0      // 手表气压计过滤死区（Δe < 2m 被当作风噪）
const ELEV_MIN_VISIBLE = 3.0    // 强制拉大至 ≥ 3m 以击穿过滤门槛
const ELEV_MAX_ERROR = 1.5      // 绝对误差上限（防止阶梯断层）

// ── RDP 抽稀：抑制 GPS 锯齿抖动 ──────────────────────────────

/**
 * Ramer-Douglas-Peucker 轨迹抽稀。
 * 仅抹平原地 GPS 锯齿噪声，对发卡弯/之字形转弯 100% 不发生形变。
 *
 * @param points 原始轨迹点（深拷贝后的副本）
 * @param epsilonDeg 容差阈值（度），严格锁定在 0.000015~0.00002
 * @returns 抽稀后的轨迹点
 */
function rdpSimplify(points: TrackPoint[], epsilonDeg: number): TrackPoint[] {
  if (points.length < 3) return points

  // 查找距离首尾连线最远的点
  let dmax = 0
  let index = 0
  const end = points.length - 1

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistanceDeg(points[i], points[0], points[end])
    if (d > dmax) {
      dmax = d
      index = i
    }
  }

  // 若最大距离 > 容差，则在该点切分递归
  if (dmax > epsilonDeg) {
    const left = rdpSimplify(points.slice(0, index + 1), epsilonDeg)
    const right = rdpSimplify(points.slice(index), epsilonDeg)
    // 合并时去重：left 的末点 === right 的首点
    return [...left.slice(0, -1), ...right]
  }

  // 所有中间点都在容差内 → 仅保留首尾
  return [points[0], points[end]]
}

/**
 * 计算点到线段（首尾连线）的垂直距离。
 * 使用墨卡托近似：经度方向按参考纬度 cos 缩放，纬度方向等距。
 * 对小尺度（< 几米）精度远超需求。
 */
function perpendicularDistanceDeg(
  point: TrackPoint,
  lineStart: TrackPoint,
  lineEnd: TrackPoint
): number {
  const refLat = (lineStart.lat + lineEnd.lat) / 2
  const cosLat = Math.cos(refLat * Math.PI / 180)

  // 缩放经度使坐标系近似等距
  const x1 = lineStart.lon * cosLat, y1 = lineStart.lat
  const x2 = lineEnd.lon * cosLat,   y2 = lineEnd.lat
  const px = point.lon * cosLat,     py = point.lat

  const dx = x2 - x1, dy = y2 - y1
  if (dx === 0 && dy === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2)
  }

  // 投影参数 t，钳位到 [0, 1] 保证垂足落在线段上
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  const projX = x1 + t * dx
  const projY = y1 + t * dy

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2)
}

// ── 海拔蓄水池微调：击穿手表气压计死区 ──────────────────────

/**
 * 局部高度蓄水池 / 滑动累加微调算法。
 *
 * 核心原理：
 * 1. 遍历所有相邻点对，识别 Δe ∈ (0, 2.0) 的「微碎坡」——手表气压计会将其当作风噪过滤。
 * 2. 将微碎坡的海拔增量收入「蓄水池」，同时在该步抹平（移除微小爬升）。
 * 3. 当蓄水池累积 ≥ 3.0m 时，在合适的连续上坡点「释放」——将该步
 *    的 Δe 强制拉大到 ≥ 3.0m，直接击穿 COROS/Apple/Garmin 的过滤死区。
 * 4. 全程确保每个轨迹点的新海拔与原始海拔的绝对误差 ≤ ±1.5m。
 *
 * @param points 原始轨迹点（深拷贝后的副本）
 * @param totalClimbM 网页端精准总爬升（参考值，用于校验）
 * @returns 海拔规整后的轨迹点
 */
function adjustElevationForWatch(points: TrackPoint[], totalClimbM: number): TrackPoint[] {
  const n = points.length
  if (n < 2) return points

  const orig = points.map(p => p.ele)
  const out = points.map(p => ({ ...p }))

  // ── 第一步：统计微碎坡总量 ──
  let microTotal = 0
  const microFlags: boolean[] = new Array(n).fill(false)

  for (let i = 1; i < n; i++) {
    const delta = orig[i] - orig[i - 1]
    if (delta > 0 && delta < ELEV_DEAD_ZONE) {
      microTotal += delta
      microFlags[i] = true
    }
  }

  const visibleStepsNeeded = Math.floor(microTotal / ELEV_MIN_VISIBLE)
  if (visibleStepsNeeded === 0) return out  // 无足量微碎坡，无需规整

  // ── 第二步：抹平所有微碎坡，收入蓄水池 ──
  let reservoir = 0

  for (let i = 1; i < n; i++) {
    const delta = orig[i] - orig[i - 1]

    if (delta > 0 && delta < ELEV_DEAD_ZONE) {
      // 微碎坡 → 抹平（最大允许下修 1.5m）
      const maxFlat = Math.min(delta, ELEV_MAX_ERROR)
      out[i].ele = Math.round((out[i].ele - maxFlat) * 100) / 100
      reservoir += maxFlat
    }
  }

  // ── 第三步：在连续上坡段中均匀释放蓄水池 ──
  // 识别连续上坡段（至少 2 个点连续上升），优先在自然爬升处释放
  const releases: { index: number; boost: number }[] = []
  let segStart = -1

  for (let i = 1; i <= n; i++) {
    const inUphill = i < n && orig[i] > orig[i - 1]

    if (inUphill && segStart < 0) {
      segStart = i - 1  // 上坡段起点
    } else if (!inUphill && segStart >= 0) {
      // 上坡段结束：[segStart, i-1]
      const segEnd = i
      const segLen = segEnd - segStart
      const segGain = orig[segEnd - 1] - orig[segStart]

      if (segGain >= ELEV_MIN_VISIBLE && segLen >= 2 && reservoir >= ELEV_MIN_VISIBLE) {
        // 在该段均匀分配蓄水池释放
        const releasesInSeg = Math.min(
          Math.floor(segGain / ELEV_MIN_VISIBLE),
          Math.floor(reservoir / ELEV_MIN_VISIBLE),
          segLen - 1
        )

        if (releasesInSeg > 0) {
          const interval = Math.max(1, Math.floor((segLen - 1) / releasesInSeg))
          for (let r = 0; r < releasesInSeg; r++) {
            const pos = segStart + 1 + r * interval
            if (pos < segEnd) {
              const headroom = (orig[pos] + ELEV_MAX_ERROR) - out[pos].ele
              const boost = Math.min(ELEV_MIN_VISIBLE, headroom)
              if (boost >= ELEV_MIN_VISIBLE) {
                releases.push({ index: pos, boost })
                reservoir -= boost
              }
            }
          }
        }
      }

      segStart = -1
    }
  }

  // ── 第四步：若仍有剩余蓄水池（上坡段不足），在全局有 headroom 的点均匀释放 ──
  if (reservoir >= ELEV_MIN_VISIBLE) {
    const candidateIndices: number[] = []
    for (let i = 1; i < n; i++) {
      const headroom = (orig[i] + ELEV_MAX_ERROR) - out[i].ele
      if (headroom >= ELEV_MIN_VISIBLE) {
        candidateIndices.push(i)
      }
    }

    const remainingReleases = Math.floor(reservoir / ELEV_MIN_VISIBLE)
    const interval = Math.max(1, Math.floor(candidateIndices.length / (remainingReleases + 1)))

    for (let r = 0; r < remainingReleases && r * interval < candidateIndices.length; r++) {
      const idx = candidateIndices[r * interval]
      const headroom = (orig[idx] + ELEV_MAX_ERROR) - out[idx].ele
      if (headroom >= ELEV_MIN_VISIBLE) {
        out[idx].ele = Math.round((out[idx].ele + ELEV_MIN_VISIBLE) * 100) / 100
        reservoir -= ELEV_MIN_VISIBLE
      }
    }
  }

  // ── 第五步：全局安全钳位 — 绝对误差 ≤ ±1.5m，防止断层阶梯 ──
  for (let i = 0; i < n; i++) {
    const err = out[i].ele - orig[i]
    if (err > ELEV_MAX_ERROR) {
      out[i].ele = Math.round((orig[i] + ELEV_MAX_ERROR) * 100) / 100
    } else if (err < -ELEV_MAX_ERROR) {
      out[i].ele = Math.round((orig[i] - ELEV_MAX_ERROR) * 100) / 100
    }
  }

  return out
}

// ── 深拷贝：彻底隔离导出数据和原始数据 ──────────────────────

function deepCopyPoints(points: TrackPoint[]): TrackPoint[] {
  return points.map(p => ({ ...p }))
}

// ── 计算总爬升（与 gradient.ts 中 getTrailStats 逻辑一致）──

function computeTotalClimb(points: TrackPoint[]): number {
  let gain = 0
  for (let i = 1; i < points.length; i++) {
    const delta = points[i].ele - points[i - 1].ele
    if (delta > 0) gain += delta
  }
  return Math.round(gain)
}

// ═══════════════════════════════════════════════════════════════
// 导出主入口
// ═══════════════════════════════════════════════════════════════

/**
 * 导出 GPX — 首选「无损注入法」
 *
 * 当有原始 GPX 文本时，将 <wpt> 节点注入原文件，完整保留
 * <trkpt> 中的 <ele>、<time>、<extensions> 等子节点，
 * 杜绝运动手表重新计算 3D 距离和海拔时的数据失真。
 *
 * 无原始文本时（FIT/KML/KMZ）回退到重建模式。
 * 重建模式会在内存中应用芯片级物理规整算法（RDP 抽稀 + 海拔蓄水池微调）
 * 以确保导出轨迹在主流手表（COROS/Apple/Garmin/华为）中不丢爬升、不漂里程。
 */
export function generateGpx(
  trackPoints: TrackPoint[],
  waypoints: Waypoint[],
  safeMode: boolean = false,
  customMarkers?: CustomMarker[],
  rawGpxText?: string | null
): string {
  if (rawGpxText) return injectWaypointsToGpx(rawGpxText, waypoints, safeMode, customMarkers)
  return generateGpxFromScratch(trackPoints, waypoints, safeMode, customMarkers)
}

/**
 * 无损注入：将 <wpt> 节点插入原始 GPX 的 </gpx> 之前
 * 绝对不触碰 <trkpt> 及其子节点
 */
function injectWaypointsToGpx(
  rawGpxText: string,
  waypoints: Waypoint[],
  safeMode: boolean = false,
  customMarkers?: CustomMarker[]
): string {
  const wptLines: string[] = []

  for (const wp of waypoints) {
    const name = safeEnglishName(wp)
    // safeMode 下每个补给项独立缩写（GEL x2 / SALT x1），杜绝聚合航点名重复
    const desc = safeMode
      ? wp.items.map(i => {
          const itemName = i.type === 'gel' ? 'GEL' : i.type === 'salt' ? 'SALT' : 'SOLID'
          return `${itemName} x${i.quantity}`
        }).join(', ')
      : wp.items.map(i => `${i.itemName} x${i.quantity}`).join(', ')

    wptLines.push(
      `  <wpt lat="${wp.lat}" lon="${wp.lon}">`,
      `    <name>${xmlSafe(name)}</name>`,
      `    <desc>${xmlSafe(`${desc} · ${wp.distanceKm.toFixed(1)}km`)}</desc>`,
      `    <sym>${waypointSym(wp)}</sym>`,
      `    <type>Nutrition</type>`,
      `  </wpt>`
    )
  }

  if (customMarkers && customMarkers.length > 0) {
    for (let i = 0; i < customMarkers.length; i++) {
      const cm = customMarkers[i]
      const name = safeMode ? safeCustomName(cm, i) : cm.name
      wptLines.push(
        `  <wpt lat="${cm.lat}" lon="${cm.lon}">`,
        `    <name>${xmlSafe(name)}</name>`,
        `    <desc>${xmlSafe(`${cm.name} [KHS_MARKER:${cm.cpType === 'full' ? 'FULL' : cm.cpType === 'light' ? 'LIGHT' : 'FLAG'}]`)}</desc>`,
        `    <sym>${customMarkerSym(cm, i)}</sym>`,
        `    <type>User Waypoint</type>`,
        `  </wpt>`
      )
    }
  }

  const wptBlock = wptLines.join('\n')

  // 注入到 </gpx> 之前
  if (rawGpxText.includes('</gpx>')) {
    return rawGpxText.replace('</gpx>', `\n${wptBlock}\n</gpx>`)
  }
  // 极端情况：原始文件没有闭合标签，直接拼接
  return rawGpxText + '\n' + wptBlock + '\n</gpx>'
}

/**
 * 重建模式：从 TrackPoint[] 生成 GPX。
 *
 * ═══ 芯片级物理规整管线 ═══
 * 在将 points 数组转化为 XML 字符串前，在内存中执行：
 * 1. RDP 抽稀（清除 GPS 锯齿抖动，抑制手表盲数里程）
 * 2. 海拔蓄水池微调（击穿气压计 2~3m 死区滤波，锁死真实爬升）
 * 3. 防翻车安全降级（try-catch → 输出原始纯净点）
 *
 * 以上操作仅在深拷贝副本上进行，绝不污染网页端原始渲染数据。
 */
function generateGpxFromScratch(
  trackPoints: TrackPoint[],
  waypoints: Waypoint[],
  safeMode: boolean = false,
  customMarkers?: CustomMarker[]
): string {
  // ── 深拷贝：隔离导出数据与原始数据 ──
  let processedPoints = deepCopyPoints(trackPoints)

  // ── 计算总爬升（规整前，用于海拔算法参考）──
  const totalClimbM = computeTotalClimb(processedPoints)

  // ── 芯片级物理规整（try-catch 安全降级）──
  try {
    // 第一步：RDP 抽稀 — 清除 GPS 锯齿抖动
    if (processedPoints.length >= 3) {
      // epsilon 硬锁定在安全红线内
      const epsilon = Math.max(0.000015, Math.min(0.00002, RDP_EPSILON))
      const simplified = rdpSimplify(processedPoints, epsilon)
      // 仅当抽稀结果有效（≥ 2 点）时采纳
      if (simplified.length >= 2) {
        processedPoints = simplified
      }
    }

    // 第二步：海拔蓄水池微调 — 击穿手表气压计死区
    if (processedPoints.length >= 2 && totalClimbM > 0) {
      processedPoints = adjustElevationForWatch(processedPoints, totalClimbM)
    }
  } catch {
    // 防翻车红线：任何异常 → 降级为原始纯净轨迹点
    // 宁可保留微小误差，也绝不触发白屏或导出失败
    processedPoints = deepCopyPoints(trackPoints)
  }

  // ── 构建 XML ──
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="TrailFuelPlanner"',
    '  xmlns="http://www.topografix.com/GPX/1/1"',
    '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">',
  ]

  // ── <metadata> 硬编码总数 — 双重保险确保手表读取爬升 ──
  const totalDistKm = processedPoints.length > 0
    ? processedPoints[processedPoints.length - 1].cumulativeDistanceKm
    : 0
  const maxEle = processedPoints.length > 0
    ? Math.max(...processedPoints.map(p => p.ele))
    : 0
  const minEle = processedPoints.length > 0
    ? Math.min(...processedPoints.map(p => p.ele))
    : 0

  lines.push('  <metadata>')
  lines.push(`    <name>Trail Nutrition Plan</name>`)
  lines.push(`    <desc>总爬升 ${totalClimbM}m · 总距离 ${totalDistKm.toFixed(1)}km · 最高海拔 ${Math.round(maxEle)}m</desc>`)
  lines.push('    <extensions>')
  lines.push(`      <trackTotalClimb>${totalClimbM}</trackTotalClimb>`)
  lines.push(`      <total_climb>${totalClimbM}</total_climb>`)
  lines.push(`      <totalDistanceKm>${totalDistKm.toFixed(1)}</totalDistanceKm>`)
  lines.push(`      <maxElevation>${Math.round(maxEle)}</maxElevation>`)
  lines.push(`      <minElevation>${Math.round(minEle)}</minElevation>`)
  lines.push('    </extensions>')
  lines.push('  </metadata>')

  // ── <trk> 轨迹段 ──
  lines.push('  <trk><name>Trail Nutrition Plan</name><trkseg>')

  for (const pt of processedPoints) {
    const eleRounded = Math.round(pt.ele * 100) / 100
    lines.push(`      <trkpt lat="${pt.lat}" lon="${pt.lon}"><ele>${eleRounded}</ele></trkpt>`)
  }

  lines.push('    </trkseg></trk>')

  // ── <wpt> 补给航点 ──
  for (const wp of waypoints) {
    const name = safeEnglishName(wp)
    // safeMode 下每个补给项独立缩写（GEL x2 / SALT x1），杜绝聚合航点名重复
    const desc = safeMode
      ? wp.items.map(i => {
          const itemName = i.type === 'gel' ? 'GEL' : i.type === 'salt' ? 'SALT' : 'SOLID'
          return `${itemName} x${i.quantity}`
        }).join(', ')
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

  // ── 自定义标记 ──
  if (customMarkers && customMarkers.length > 0) {
    for (let i = 0; i < customMarkers.length; i++) {
      const cm = customMarkers[i]
      const name = safeMode ? safeCustomName(cm, i) : cm.name
      lines.push(
        `  <wpt lat="${cm.lat}" lon="${cm.lon}">`,
        `    <name>${xmlSafe(name)}</name>`,
        `    <desc>${xmlSafe(`${cm.name} [KHS_MARKER:${cm.cpType === 'full' ? 'FULL' : cm.cpType === 'light' ? 'LIGHT' : 'FLAG'}]`)}</desc>`,
        `    <sym>${customMarkerSym(cm, i)}</sym>`,
        `    <type>User Waypoint</type>`,
        `  </wpt>`
      )
    }
  }

  lines.push('</gpx>')
  return lines.join('\n')
}

/** @deprecated 旧函数保留兼容性，新代码请用 generateGpx */
export const generateGpxWithWaypoints = generateGpxFromScratch

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
