/** 坡度 → 颜色映射 */
export function gradientToColor(gradient: number, alpha: number = 1): string {
  if (gradient > 3) {
    // 上坡: 紫红 Magenta
    return `rgba(255, 0, 255, ${alpha})`
  }
  if (gradient < -3) {
    // 下坡: 青蓝 Cyan
    return `rgba(0, 255, 255, ${alpha})`
  }
  // 平路: 白/浅灰
  return `rgba(230, 191, 154, ${alpha})`
}

/** 坡度 → 十六进制颜色 (Leaflet Polyline 使用) */
export function gradientToHex(gradient: number): string {
  if (gradient > 3) return '#ff00ff'
  if (gradient < -3) return '#00ffff'
  return '#e6bf9a'
}

/** 坡度 → Chart.js segment 颜色 */
export function gradientToChartColor(gradient: number): string {
  if (gradient > 3) return '#ff00ff'
  if (gradient < -3) return '#00ffff'
  return '#e6bf9a'
}
