import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import ErrorBoundary from './components/layout/ErrorBoundary'

// ═══════════════════════════════════════════════════════════════
// 🔒 v3.1 线上沙箱首次启动：物理粉碎所有不兼容的陈年旧缓存
//
// 触发场景：微信内置浏览器 / 旧版 Service Worker 残留 /
//           Mapbox/Leaflet 跨域安全策略变更后残留的死锁数据
//
// 原理：旧版本 localStorage 可能含有格式不兼容的脏数据，
//       在 React 渲染前异步反噬 → 浏览器判定为恶意脚本劫持 →
//       强行切断进程 → about:blank 物理自杀。
//
// 写入版本锁后，此后刷新不再重复清理（尊重用户自定义配置）。
// ═══════════════════════════════════════════════════════════════
if (typeof window !== 'undefined' && !localStorage.getItem('khs_v3_fresh_lock')) {
  try {
    localStorage.clear()
    localStorage.setItem('khs_v3_fresh_lock', 'true')
    console.log('⚙️ 线上沙箱首次启动，已物理粉碎所有不兼容的陈年旧缓存！')
  } catch (e) {
    // localStorage 不可用（无痕模式/隐私模式）→ 静默降级
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
