import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

/**
 * 🔒 v3.1 全局防崩溃隔离区
 * 任何底层渲染异常（地图 SDK 安全错误、脏数据反噬等）被此处拦截后，
 * 仅显示降级 UI，绝不触发浏览器 about:blank 物理自杀。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('🛡️ ErrorBoundary 拦截到致命异常，已阻止浏览器自杀:', error)
    console.error('组件堆栈:', info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#f2f2f7', color: '#1d1d1f',
          fontFamily: '-apple-system, "Segoe UI", sans-serif', padding: '24px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            KHS 智能补给规划
          </h1>
          <p style={{ fontSize: '14px', color: '#86868b', textAlign: 'center', maxWidth: '320px', lineHeight: 1.6 }}>
            初始化时遇到环境兼容问题，已自动触发安全隔离保护。
          </p>
          <pre style={{
            marginTop: '16px', padding: '12px', borderRadius: '12px',
            background: '#fff', fontSize: '11px', color: '#ff3b30',
            maxWidth: '340px', overflow: 'auto', whiteSpace: 'pre-wrap',
          }}>
            {this.state.error?.message ?? '未知异常'}
          </pre>
          <button
            onClick={() => {
              localStorage.clear()
              window.location.reload()
            }}
            style={{
              marginTop: '16px', padding: '12px 32px', borderRadius: '12px',
              background: '#007aff', color: '#fff', fontSize: '14px', fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}
          >
            清除本地缓存并重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
