/**
 * FIT/GPX/KML/KMZ 文件解析器 — 100% 前端解析，零网络请求
 */
import FitParser from 'fit-file-parser'
import JSZip from 'jszip'
import type { TrackPoint, CustomMarker } from '../types/trail'

export interface ParsedActivity {
  durationMinutes: number
  distanceKm: number
  elevationGainM: number
  avgHeartRate: number | null
  fileName: string
}

function sanitize(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ==================== 统一入口 ====================

const SUPPORTED_EXTENSIONS = ['.gpx', '.fit', '.kml', '.kmz']

export function getSupportedExtensions(): string[] {
  return SUPPORTED_EXTENSIONS
}

export function getAcceptString(): string {
  return SUPPORTED_EXTENSIONS.join(',')
}

/**
 * 扫描 GPX <wpt> 节点，识别 KHS_MARKER 标识并还原为 CustomMarker[]
 * 解析失败不影响轨迹解析，静默丢弃无效条目
 */
export function parseKhsMarkersFromGpx(xmlText: string): CustomMarker[] {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlText, 'text/xml')
    if (doc.querySelector('parsererror')) return []

    const wptNodes = doc.querySelectorAll('wpt')
    const markers: CustomMarker[] = []

    wptNodes.forEach((wpt) => {
      const lat = parseFloat(wpt.getAttribute('lat') || '')
      const lon = parseFloat(wpt.getAttribute('lon') || '')
      if (isNaN(lat) || isNaN(lon)) return

      const descEl = wpt.querySelector('desc')
      const desc = descEl?.textContent || ''
      const match = desc.match(/\[KHS_MARKER:(FULL|LIGHT|FLAG)\]/)
      if (!match) return

      const typeTag = match[1]
      const cpType = typeTag === 'FULL' ? 'full' : typeTag === 'LIGHT' ? 'light' : undefined as 'full' | 'light' | undefined
      const name = desc.replace(/\s*\[KHS_MARKER:.*?\]\s*/, '').trim() || '导入标记'

      markers.push({
        id: `khs_import_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        lat,
        lon,
        trackPointIndex: -1,
        distanceKm: 0,
        cpType,
      })
    })

    return markers
  } catch {
    return []
  }
}

/** 统一解析入口：根据文件后缀分发到对应解析器 */
export async function parseFile(file: File): Promise<{ points: TrackPoint[]; rawText: string | null; importedMarkers: CustomMarker[] }> {
  const fileName = file.name
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

  switch (ext) {
    case '.gpx': {
      const text = await file.text()
      const importedMarkers = parseKhsMarkersFromGpx(text)
      return { points: parseGpxToTrackPoints(text), rawText: text, importedMarkers }
    }
    case '.fit': {
      const buf = await file.arrayBuffer()
      return { points: await parseFitToTrackPoints(buf), rawText: null, importedMarkers: [] }
    }
    case '.kml': {
      const text = await file.text()
      return { points: parseKmlFile(text, fileName), rawText: null, importedMarkers: [] }
    }
    case '.kmz': {
      const buf = await file.arrayBuffer()
      return { points: await parseKmzFile(buf, fileName), rawText: null, importedMarkers: [] }
    }
    default:
      throw new Error(`不支持的文件格式: ${ext}，支持: ${SUPPORTED_EXTENSIONS.join(', ')}`)
  }
}

// ==================== FIT (summary) ====================

export function parseFitFile(buffer: ArrayBuffer, fileName: string): Promise<ParsedActivity> {
  return new Promise((resolve, reject) => {
    try {
      const fitParser = new FitParser({
        force: true,
        speedUnit: 'm/s',
        lengthUnit: 'm',
        temperatureUnit: 'celsius',
        elapsedRecordField: false,
        mode: 'list',
      })

      fitParser.parse(new Uint8Array(buffer), (error: string | undefined, data: any) => {
        if (error) { reject(new Error('FIT 解析失败: ' + error)); return }

        try {
          const records = data?.records || []
          if (records.length === 0) { reject(new Error('FIT 记录为空')); return }

          const first = records[0]
          const last = records[records.length - 1]

          const timerTime = last.total_timer_time ?? first.total_timer_time ?? 0
          const elapsedSec = (() => {
            const s = first.timestamp ? new Date(first.timestamp).getTime() : 0
            const e = last.timestamp ? new Date(last.timestamp).getTime() : 0
            return e > s ? (e - s) / 1000 : 0
          })()
          const durationSec = timerTime > 0 ? timerTime : elapsedSec

          const distM = last.total_distance ?? 0

          let ascent = 0
          for (let i = 1; i < records.length; i++) {
            const pa = records[i - 1]?.altitude
            const ca = records[i]?.altitude
            if (pa != null && ca != null && ca > pa) ascent += ca - pa
          }

          let hrSum = 0, hrCnt = 0
          for (const r of records) {
            if (r.heart_rate > 0) { hrSum += r.heart_rate; hrCnt++ }
          }
          const avgHR = hrCnt > 0 ? Math.round(hrSum / hrCnt) : null

          resolve({
            durationMinutes: Math.round(durationSec / 60),
            distanceKm: Math.round((distM / 1000) * 100) / 100,
            elevationGainM: Math.round(ascent),
            avgHeartRate: avgHR,
            fileName: sanitize(fileName),
          })
        } catch {
          reject(new Error('FIT 数据提取失败'))
        }
      })
    } catch {
      reject(new Error('FIT 解析器初始化失败'))
    }
  })
}

// ==================== GPX (summary + track points) ====================

export function parseGpxFile(text: string, fileName: string): ParsedActivity {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')

  if (doc.querySelector('parsererror')) throw new Error('GPX XML 格式错误')

  let points = doc.querySelectorAll('trkpt')
  if (points.length < 2) points = doc.querySelectorAll('rtept')
  if (points.length < 2) throw new Error('GPX 轨迹点不足')

  let dist = 0, ascent = 0
  let prevLat: number | null = null, prevLon: number | null = null, prevEle: number | null = null
  let firstTime: number | null = null, lastTime: number | null = null

  for (let i = 0; i < points.length; i++) {
    const pt = points[i]
    const lat = parseFloat(pt.getAttribute('lat') || '0')
    const lon = parseFloat(pt.getAttribute('lon') || '0')
    const eleEl = pt.querySelector('ele')
    const ele = eleEl ? parseFloat(eleEl.textContent || '0') : null

    const timeEl = pt.querySelector('time')
    if (timeEl) {
      const t = new Date(timeEl.textContent || '').getTime()
      if (!isNaN(t)) {
        if (firstTime === null) firstTime = t
        lastTime = t
      }
    }

    if (prevLat != null && prevLon != null) dist += haversine(prevLat, prevLon, lat, lon)
    if (ele != null && prevEle != null && ele > prevEle) ascent += ele - prevEle
    if (ele != null) prevEle = ele
    prevLat = lat; prevLon = lon
  }

  const gpxDurationMin = (firstTime && lastTime && lastTime > firstTime)
    ? Math.round((lastTime - firstTime) / 60000)
    : Math.round((dist / 10) * 60)

  let hrSum = 0, hrCnt = 0
  doc.querySelectorAll('gpxtpx\\:hr, hr').forEach((el) => {
    const v = parseInt(el.textContent || '0')
    if (v > 0) { hrSum += v; hrCnt++ }
  })

  return {
    durationMinutes: gpxDurationMin || 60,
    distanceKm: Math.round(dist * 100) / 100,
    elevationGainM: Math.round(ascent),
    avgHeartRate: hrCnt > 0 ? Math.round(hrSum / hrCnt) : null,
    fileName: sanitize(fileName),
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ==================== GPX → TrackPoint[] ====================

export function parseGpxToTrackPoints(text: string): TrackPoint[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')
  if (doc.querySelector('parsererror')) throw new Error('GPX XML 格式错误')

  let pts = doc.querySelectorAll('trkpt')
  if (pts.length < 2) pts = doc.querySelectorAll('rtept')
  if (pts.length < 2) throw new Error('GPX 轨迹点不足')

  const raw: { lat: number; lon: number; ele: number }[] = []
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i]
    const lat = Number(parseFloat(pt.getAttribute('lat') || '0'))
    const lon = Number(parseFloat(pt.getAttribute('lon') || '0'))
    if (isNaN(lat) || isNaN(lon)) continue
    const eleEl = pt.querySelector('ele')
    const eleRaw = Number(parseFloat(eleEl?.textContent || '0'))
    const ele = isNaN(eleRaw) ? 0 : eleRaw
    raw.push({ lat, lon, ele })
  }

  // 默认海拔填充
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].ele === 0 && raw[i - 1].ele > 0) raw[i].ele = raw[i - 1].ele
  }

  return buildTrackPoints(raw)
}

// ==================== FIT → TrackPoint[] ====================

export function parseFitToTrackPoints(buffer: ArrayBuffer): Promise<TrackPoint[]> {
  return new Promise((resolve, reject) => {
    try {
      const fitParser = new FitParser({
        force: true,
        speedUnit: 'm/s',
        lengthUnit: 'm',
        mode: 'list',
      })

      fitParser.parse(new Uint8Array(buffer), (error: string | undefined, data: any) => {
        if (error) { reject(new Error('FIT 解析失败: ' + error)); return }

        try {
          const records = data?.records || []
          if (records.length < 2) { reject(new Error('FIT 记录不足')); return }

          const raw: { lat: number; lon: number; ele: number }[] = []
          for (const r of records) {
            if (r.position_lat != null && r.position_long != null) {
              raw.push({
                lat: Number(r.position_lat),
                lon: Number(r.position_long),
                ele: Number(r.altitude ?? 0),
              })
            }
          }
          if (raw.length < 2) { reject(new Error('FIT 有效坐标不足')); return }

          for (let i = 1; i < raw.length; i++) {
            if (raw[i].ele === 0 && raw[i - 1].ele > 0) raw[i].ele = raw[i - 1].ele
          }

          resolve(buildTrackPoints(raw))
        } catch (e: any) {
          reject(new Error('FIT 数据提取失败: ' + (e.message || '')))
        }
      })
    } catch (e: any) {
      reject(new Error('FIT 解析器初始化失败: ' + (e.message || '')))
    }
  })
}

// ==================== KML → TrackPoint[] ====================

/** KML 格式解析：提取 <coordinates> 中的 lon,lat,ele */
export function parseKmlFile(text: string, _fileName: string): TrackPoint[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')
  if (doc.querySelector('parsererror')) throw new Error('KML XML 格式错误')

  // KML 坐标在 <coordinates> 标签中，格式: "lon,lat,ele lon,lat,ele ..."
  const coordNodes = doc.querySelectorAll('coordinates')
  const allCoords: string[] = []
  coordNodes.forEach(node => {
    const txt = (node.textContent || '').trim()
    if (txt) allCoords.push(txt)
  })

  if (allCoords.length === 0) throw new Error('KML 文件中未找到坐标数据')

  // 合并所有坐标块
  const raw: { lat: number; lon: number; ele: number }[] = []
  for (const block of allCoords) {
    // 坐标点之间用空白分隔（空格、换行、制表符）
    const tuples = block.split(/\s+/).filter(Boolean)
    for (const tuple of tuples) {
      const parts = tuple.split(',')
      if (parts.length < 2) continue
      const lon = Number(parseFloat(parts[0]))
      const lat = Number(parseFloat(parts[1]))
      const ele = parts.length >= 3 ? Number(parseFloat(parts[2])) : 0
      if (!isNaN(lat) && !isNaN(lon)) {
        raw.push({ lat, lon, ele })
      }
    }
  }

  if (raw.length < 2) throw new Error('KML 轨迹点不足（至少需要2个有效坐标）')

  // 默认海拔填充
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].ele === 0 && raw[i - 1].ele > 0) raw[i].ele = raw[i - 1].ele
  }

  return buildTrackPoints(raw)
}

// ==================== KMZ → TrackPoint[] ====================

/** KMZ 是 KML 的 ZIP 压缩包，解压后取第一个 .kml 文件 */
export async function parseKmzFile(buffer: ArrayBuffer, fileName: string): Promise<TrackPoint[]> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    throw new Error('KMZ 文件损坏或不是有效的 ZIP 压缩包')
  }

  // 查找 .kml 文件
  const kmlFile = Object.keys(zip.files).find(name =>
    name.toLowerCase().endsWith('.kml') && !zip.files[name].dir
  )

  if (!kmlFile) throw new Error('KMZ 压缩包中未找到 .kml 文件')

  const kmlText = await zip.files[kmlFile].async('string')
  return parseKmlFile(kmlText, fileName)
}

// ==================== 共享工具 ====================

/** 将 raw 点数组转换为含累计距离和坡度的 TrackPoint[] */
function buildTrackPoints(raw: { lat: number; lon: number; ele: number }[]): TrackPoint[] {
  const result: TrackPoint[] = []
  let cumulativeDist = 0

  for (let i = 0; i < raw.length; i++) {
    let segDist = 0
    let gradient = 0
    if (i > 0 && !isNaN(raw[i - 1].lat) && !isNaN(raw[i - 1].lon) && !isNaN(raw[i].lat) && !isNaN(raw[i].lon)) {
      segDist = haversine(raw[i - 1].lat, raw[i - 1].lon, raw[i].lat, raw[i].lon)
      const eleDelta = raw[i].ele - raw[i - 1].ele
      gradient = segDist > 0.001 ? (eleDelta / (segDist * 1000)) * 100 : 0
    }
    cumulativeDist += segDist

    result.push({
      lat: raw[i].lat,
      lon: raw[i].lon,
      ele: raw[i].ele,
      cumulativeDistanceKm: Math.round(cumulativeDist * 1000) / 1000,
      gradient: Math.round(gradient * 100) / 100,
      timeElapsed: 0,
    })
  }

  return result
}
