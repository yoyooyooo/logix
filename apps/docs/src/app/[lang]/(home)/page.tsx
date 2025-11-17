import { Background } from './components/Background'
import { Hero } from './components/Hero'
import { FeatureCards } from './components/FeatureCards'
import { NextSteps } from './components/NextSteps'
import { TimeTravel } from './components/TimeTravel'

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden selection:bg-cyan-500/30 bg-white dark:bg-black transition-colors duration-500">
      <Background />

      <div className="flex-1 flex flex-col">
        <Hero />
        <NextSteps />
        <TimeTravel />
        <FeatureCards />
      </div>

      <footer className="py-12 text-center text-xs text-gray-600 dark:text-neutral-600 border-t border-gray-200 dark:border-white/5 mt-12 bg-white dark:bg-black">
        <div className="mb-4">
          <span className="font-bold text-gray-500 tracking-widest uppercase">Logix Runtime</span>
        </div>
        © {new Date().getFullYear()} Logix.
      </footer>
    </main>
  )
}
