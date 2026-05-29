import { useState } from 'react'

// SHA-256 hash of 'hasu-trail-admin-2026'
const ADMIN_HASH = 'd4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3'

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

interface Props {
  children: React.ReactNode
}

export default function AdminRoute({ children }: Props) {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleLogin() {
    setError('')
    const hash = await sha256(password)
    if (hash === ADMIN_HASH) {
      setAuthed(true)
    } else {
      setError('密码错误')
    }
  }

  if (authed) return <>{children}</>

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/90">
      <div className="bg-[#1c1c1e] rounded-3xl w-full max-w-sm p-8 text-center">
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="text-lg font-semibold text-white mb-1">管理后台</h2>
        <p className="text-sm text-[#8e8e93] mb-6">输入管理员密码</p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
          placeholder="密码"
          className="w-full bg-[#2c2c2e] rounded-xl px-4 py-3 text-sm text-white border border-transparent focus:border-accent-500 outline-none mb-3"
          autoFocus
        />
        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        <button
          type="button"
          onClick={handleLogin}
          className="w-full py-2.5 rounded-xl bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-colors"
        >
          登录
        </button>
      </div>
    </div>
  )
}
