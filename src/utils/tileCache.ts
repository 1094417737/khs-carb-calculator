/**
 * IndexedDB 瓦片缓存 — 离线地图支持
 *
 * 策略：
 * 1. 在线时请求的瓦片自动写入 IndexedDB
 * 2. 离线时从 IndexedDB 读取
 * 3. 提供预缓存功能：下载轨迹范围 z12-16 瓦片
 *
 * 零侵入：不改 Leaflet TileLayer 基类，仅提供缓存读写 helper
 */

const DB_NAME = 'khs-tile-cache'
const DB_VERSION = 1
const STORE_NAME = 'tiles'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** 从缓存读取瓦片（base64 data URL），未命中返回 null */
export async function getCachedTile(key: string): Promise<string | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
      tx.oncomplete = () => db.close()
    })
  } catch {
    return null
  }
}

/** 将瓦片写入缓存 */
export async function putCachedTile(key: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(dataUrl, key)
    tx.oncomplete = () => db.close()
  } catch { /* 静默写入失败 */ }
}

/** 缓存统计 */
export async function getCacheStats(): Promise<{ count: number; sizeMB: number }> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      let count = 0
      let size = 0
      const cursorReq = tx.objectStore(STORE_NAME).openCursor()
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (cursor) {
          count++
          size += (cursor.value as string).length
          cursor.continue()
        } else {
          db.close()
          resolve({ count, sizeMB: Math.round(size / 1024 / 1024 * 10) / 10 })
        }
      }
      cursorReq.onerror = () => { db.close(); resolve({ count: 0, sizeMB: 0 }) }
    })
  } catch {
    return { count: 0, sizeMB: 0 }
  }
}

/** 计算给定范围所需的瓦片键列表 */
export function tileKeysForBounds(
  minLat: number, maxLat: number,
  minLon: number, maxLon: number,
  minZoom: number, maxZoom: number
): string[] {
  const keys: string[] = []
  for (let z = minZoom; z <= maxZoom; z++) {
    const n = 1 << z
    const x1 = Math.max(0, Math.floor((minLon + 180) / 360 * n))
    const x2 = Math.min(n - 1, Math.floor((maxLon + 180) / 360 * n))
    const latToY = (lat: number) => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n
    const y1 = Math.max(0, Math.floor(latToY(maxLat)))
    const y2 = Math.min(n - 1, Math.floor(latToY(minLat)))
    for (let x = x1; x <= x2; x++) {
      for (let y = y1; y <= y2; y++) {
        keys.push(`${z}/${x}/${y}`)
      }
    }
  }
  return keys
}

/** 从 URL 抓取瓦片并转 base64 */
async function fetchTileAsDataUrl(url: string): Promise<string> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const blob = await resp.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

/** 下载瓦片到缓存（可中断） */
export async function downloadTiles(
  keys: string[],
  baseUrlTemplate: string,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<{ cached: number; failed: number }> {
  let cached = 0
  let failed = 0

  for (let i = 0; i < keys.length; i++) {
    if (signal?.aborted) break
    const key = keys[i]
    // 已缓存则跳过
    const existing = await getCachedTile(key)
    if (existing) { cached++; onProgress?.(i + 1, keys.length); continue }

    // CartoDB subdomain round-robin
    const subdomain = 'abc'[i % 3]
    const url = baseUrlTemplate
      .replace('{s}', subdomain)
      .replace('{z}', key.split('/')[0])
      .replace('{x}', key.split('/')[1])
      .replace('{y}', key.split('/')[2])
      .replace('{r}', '')

    try {
      const dataUrl = await fetchTileAsDataUrl(url)
      await putCachedTile(key, dataUrl)
      cached++
    } catch {
      failed++
    }
    onProgress?.(i + 1, keys.length)
  }

  return { cached, failed }
}
