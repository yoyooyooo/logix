import { Suspense, lazy } from 'react'
import { useDispatch, useModule } from '@logixjs/react'
import { NavLink, Outlet } from 'react-router-dom'
import { AuthDef } from './galaxy/auth.module'

const Devtools = import.meta.env.DEV
  ? lazy(async () => {
      const mod = await import('@logixjs/devtools-react')
      return { default: mod.LogixDevtools }
    })
  : null

export default function App() {
  const authPhase = useModule(AuthDef, (s) => s.phase)
  const authUser = useModule(AuthDef, (s) => s.user)

  const dispatchAuth = useDispatch(AuthDef.tag)

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="font-semibold">Logix Galaxy</div>
            <nav className="flex items-center gap-3 text-sm text-zinc-700">
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  `rounded px-2 py-1 ${isActive ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`
                }
              >
                Projects
              </NavLink>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `rounded px-2 py-1 ${isActive ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`
                }
              >
                Login
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {authPhase === 'authenticated' ? (
              <>
                <div className="text-zinc-700">
                  {(authUser as any)?.displayName ?? (authUser as any)?.email ?? '已登录'}
                </div>
                <button
                  className="rounded border bg-white px-3 py-1 hover:bg-zinc-50"
                  onClick={() => dispatchAuth({ _tag: 'logout', payload: undefined })}
                >
                  Logout
                </button>
              </>
            ) : authPhase === 'booting' ? (
              <div className="text-zinc-500">Session…</div>
            ) : (
              <div className="text-zinc-500">未登录</div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        <Outlet />
      </main>

      {Devtools ? (
        <Suspense fallback={null}>
          <Devtools position="bottom-right" />
        </Suspense>
      ) : null}
    </div>
  )
}
