import { Cpu, Brain, Zap, Layers, Boxes } from 'lucide-react'

export function PositioningMap() {
  return (
    <div className="w-full max-w-5xl mx-auto py-20 px-4 animate-fade-in-up delay-500">
      <div className="relative flex flex-col items-center justify-center lg:flex-row gap-8 lg:gap-16">
        {/* Connection Lines (Desktop) */}
        <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent -z-10 transform -translate-y-1/2"></div>

        {/* Node 1: AI / Intent */}
        <div className="flex flex-col items-center gap-4 group">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-xl shadow-2xl transition duration-500 group-hover:scale-110 group-hover:shadow-purple-500/20 group-hover:border-purple-500/30">
            <Brain className="h-8 w-8 text-purple-400" />
            <div className="absolute inset-0 -z-10 rounded-2xl bg-purple-500/10 opacity-0 transition group-hover:opacity-100 blur-lg"></div>
          </div>
          <div className="text-center">
            <h3 className="font-bold text-white">AI Intent</h3>
            <p className="text-sm text-neutral-500">Flexible, Ambiguous</p>
          </div>
        </div>

        {/* Arrow Right */}
        <div className="text-neutral-600 lg:rotate-0 rotate-90">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M5 12H19M19 12L12 5M19 12L12 19"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Node 2: Logix Core (Center) */}
        <div className="flex flex-col items-center gap-4 z-10 scale-110 group">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-white/20 bg-black/80 backdrop-blur-2xl shadow-2xl ring-1 ring-white/10 transition duration-500 group-hover:shadow-cyan-500/30 group-hover:border-cyan-400">
            <Cpu className="h-12 w-12 text-cyan-400" />

            {/* Spinning Border Effect (Simulated) */}
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-cyan-400 to-purple-600 opacity-20 blur-sm group-hover:opacity-40 transition"></div>
          </div>
          <div className="text-center">
            <div className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-cyan-950 text-cyan-300 mb-1">
              The Bridge
            </div>
            <h3 className="text-xl font-bold text-white">Logix Runtime</h3>
            <p className="text-sm text-neutral-400">Deterministic Flow</p>
          </div>
        </div>

        {/* Arrow Right */}
        <div className="text-neutral-600 lg:rotate-0 rotate-90">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M5 12H19M19 12L12 5M19 12L12 19"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Node 3: Effect / Execution */}
        <div className="flex flex-col items-center gap-4 group">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-xl shadow-2xl transition duration-500 group-hover:scale-110 group-hover:shadow-emerald-500/20 group-hover:border-emerald-500/30">
            <Zap className="h-8 w-8 text-emerald-400" />
            <div className="absolute inset-0 -z-10 rounded-2xl bg-emerald-500/10 opacity-0 transition group-hover:opacity-100 blur-lg"></div>
          </div>
          <div className="text-center">
            <h3 className="font-bold text-white">Effect System</h3>
            <p className="text-sm text-neutral-500">Resilient Execution</p>
          </div>
        </div>
      </div>

      {/* Sub-layers visualization (Optional decoration) */}
      <div className="mt-16 border-t border-neutral-800 pt-8 flex justify-center gap-8 opacity-50">
        <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
          <Layers className="h-4 w-4" /> STATIC IR
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
          <Boxes className="h-4 w-4" /> DYNAMIC TRACE
        </div>
      </div>
    </div>
  )
}
