import { useDispatch, useModule } from '@logix/react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthDef } from '../galaxy/auth.module'

export function LoginPage() {
  const phase = useModule(AuthDef, (s) => s.phase)
  const pending = useModule(AuthDef, (s) => s.pending)
  const error = useModule(AuthDef, (s) => s.error)

  const dispatchAuth = useDispatch(AuthDef.tag)

  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123456')

  const location = useLocation()
  const navigate = useNavigate()

  const nextPath = useMemo(() => {
    const state: any = location.state
    return typeof state?.next === 'string' ? state.next : '/projects'
  }, [location.state])

  useEffect(() => {
    if (phase !== 'authenticated') return
    navigate(nextPath, { replace: true })
  }, [navigate, nextPath, phase])

  if (phase === 'authenticated') {
    return <Navigate to={nextPath} replace />
  }

  return (
    <div className="max-w-md space-y-4">
      <div>
        <h1 className="text-xl font-semibold">登录</h1>
        <div className="mt-1 text-sm text-zinc-600">使用 BetterAuth 账号登录后进入项目管理。</div>
      </div>

      <div className="rounded border bg-white p-4 space-y-3">
        {error ? <div className="text-sm text-red-700">{error}</div> : null}

        <label className="block text-sm space-y-1">
          <div className="text-zinc-600">Email</div>
          <input
            className="w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            disabled={pending}
          />
        </label>

        <label className="block text-sm space-y-1">
          <div className="text-zinc-600">Password</div>
          <input
            className="w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            disabled={pending}
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            className="rounded border bg-zinc-900 text-white px-3 py-2 text-sm disabled:opacity-60"
            onClick={() => dispatchAuth({ _tag: 'login', payload: { email, password } })}
            disabled={pending}
          >
            {pending ? 'Logging in…' : 'Login'}
          </button>
          <button
            className="rounded border bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
            onClick={() => {
              setEmail('admin@example.com')
              setPassword('admin123456')
            }}
            disabled={pending}
          >
            Fill Admin
          </button>
        </div>
      </div>
    </div>
  )
}
