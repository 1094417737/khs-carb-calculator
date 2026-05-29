/**
 * 纯前端激活码验证 (SHA-256)
 * 月订阅 + 永久买断 + 超级密码后门 + 防时间篡改
 */

const SUPER_PASSWORD = 'HASU-DEV-UNLOCK-2026'

// 预计算的激活码 SHA-256 哈希
// 格式: { hash: 到期时间戳 (0=永久) }
const ACTIVATION_HASHES: Record<string, number> = {
  // DEMO-30DAY → 30天试用
  'b2a9a340fb0532e1e37c461e776c728b1d45946d4ec6fc139c39a4efd7af8221': Date.now() + 30 * 86400 * 1000,
  // KHS-VIP-LIFETIME → 永久买断
  '543930fef1560e4fd68285f837f3461d2248bf9335daf3d94cd98f278ae9c530': 0,
}

const LS_KEY = 'vip_premium'
const LS_SUB_KEY = 'vip_sub_expiry'
const LS_TIME_KEY = 'vip_time_check'

/** 简易 SHA-256 (浏览器 Web Crypto API) */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 检查是否已解锁 */
export function isPremium(): boolean {
  const stored = localStorage.getItem(LS_KEY)
  if (stored === 'true') {
    // 检查月订阅是否过期
    const subExpiry = localStorage.getItem(LS_SUB_KEY)
    if (subExpiry) {
      const expiry = parseInt(subExpiry, 10)
      if (Date.now() > expiry) {
        // 订阅已过期
        return false
      }
    }
    return true
  }
  return false
}

/** 验证激活码 */
export async function verifyActivation(code: string): Promise<{
  success: boolean
  message: string
  permanent: boolean
}> {
  // 超级密码后门
  if (code === SUPER_PASSWORD) {
    unlock(true)
    return { success: true, message: '开发者模式已解锁', permanent: true }
  }

  // 检查防时间篡改
  if (detectTimeTampering()) {
    return { success: false, message: '检测到系统时间异常，请先修正时间', permanent: false }
  }

  // 哈希比对
  const hash = await sha256(code.trim().toUpperCase())
  const expiry = ACTIVATION_HASHES[hash]

  if (expiry !== undefined) {
    if (expiry === 0) {
      // 永久买断
      unlock(true)
      return { success: true, message: '永久买断已激活', permanent: true }
    } else if (expiry > Date.now()) {
      // 有效订阅
      unlock(false)
      localStorage.setItem(LS_SUB_KEY, String(expiry))
      return { success: true, message: `订阅已激活，有效期至 ${new Date(expiry).toLocaleDateString('zh-CN')}`, permanent: false }
    } else {
      return { success: false, message: '该激活码已过期', permanent: false }
    }
  }

  return { success: false, message: '激活码无效', permanent: false }
}

function unlock(permanent: boolean) {
  localStorage.setItem(LS_KEY, 'true')
  if (permanent) {
    localStorage.removeItem(LS_SUB_KEY)
  }
  updateTimeCheck()
}

/** 防时间篡改: 记录时间检查点 */
function updateTimeCheck() {
  const record = JSON.stringify({ time: Date.now(), count: 0 })
  localStorage.setItem(LS_TIME_KEY, record)
}

/** 检测用户是否在短时间内多次回拨系统时间 */
function detectTimeTampering(): boolean {
  try {
    const stored = localStorage.getItem(LS_TIME_KEY)
    if (!stored) return false
    const { time, count } = JSON.parse(stored)
    const now = Date.now()
    // 时间回拨超过 1 小时
    if (now < time - 3600000) {
      const newCount = (count || 0) + 1
      // 30天内超过3次时间回拨 → 锁定
      if (newCount > 3) {
        localStorage.setItem(LS_KEY, 'false')
        localStorage.removeItem(LS_SUB_KEY)
        return true
      }
      localStorage.setItem(LS_TIME_KEY, JSON.stringify({ time: now, count: newCount }))
      return false // 第一次警告但不锁定
    }
    // 正常时间流逝, 更新记录
    if (now > time) {
      localStorage.setItem(LS_TIME_KEY, JSON.stringify({ time: now, count: 0 }))
    }
    return false
  } catch {
    return false
  }
}

/** 注销 (仅供测试) */
export function clearPremium() {
  localStorage.removeItem(LS_KEY)
  localStorage.removeItem(LS_SUB_KEY)
  localStorage.removeItem(LS_TIME_KEY)
}
