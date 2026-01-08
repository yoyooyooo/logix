import type { LucideIcon } from 'lucide-react'
import { BookOpen, Brain, Code2, GitGraph, History, Puzzle, Rocket, ShieldCheck, Sparkles, TimerReset } from 'lucide-react'

export type LandingLang = 'cn' | 'en'

export type HeroCopy = {
  readonly badge: string
  readonly title: string
  readonly slogan: string
  readonly description: string
  readonly docsCta: string
  readonly sourceCta: string
}

type NextStepItem = {
  readonly icon: LucideIcon
  readonly title: string
  readonly description: string
  readonly href: string
}

type FeatureItem = {
  readonly icon: LucideIcon
  readonly title: string
  readonly description: string
}

export type NextStepsCopy = {
  readonly title: string
  readonly description: string
  readonly items: ReadonlyArray<NextStepItem>
}

export type TimeTravelCopy = {
  readonly title: string
  readonly description: string
  readonly highlight: string
  readonly mockTitle: string
  readonly mockHint: string
}

export type FeaturesCopy = {
  readonly title: string
  readonly description: string
  readonly items: ReadonlyArray<FeatureItem>
}

export type FAQCopy = {
  readonly title: string
  readonly items: ReadonlyArray<{ readonly q: string; readonly a: string }>
}

export type FinalCtaCopy = {
  readonly title: string
  readonly description: string
  readonly primaryCta: string
  readonly badge: string
}

export type FooterCopy = {
  readonly brand: string
  readonly sourceHref: string
}

export type LandingContent = {
  readonly hero: HeroCopy
  readonly nextSteps: NextStepsCopy
  readonly timeTravel: TimeTravelCopy
  readonly features: FeaturesCopy
  readonly faq: FAQCopy
  readonly finalCta: FinalCtaCopy
  readonly footer: FooterCopy
}

export const landingCopy: Record<LandingLang, LandingContent> = {
  cn: {
    hero: {
      badge: '公开预览',
      title: 'Logix',
      slogan: 'React 心智模型，确定性可观测运行时',
      description: '用组件的方式组织规则与状态。执行顺序稳定、标识稳定，运行过程可观测、可追踪、可回放。',
      docsCta: '阅读文档',
      sourceCta: '查看源码',
    },
    nextSteps: {
      title: '从这里开始',
      description: '三个入口：快速开始、核心心智与 API。',
      items: [
        {
          icon: Rocket,
          title: '快速开始',
          description: '跑通第一个应用：Modules、State 与 Flows。',
          href: '/guide/get-started/quick-start',
        },
        {
          icon: Brain,
          title: 'Thinking in Logix',
          description: '用 React 心智模型理解规则与状态。',
          href: '/guide/essentials/thinking-in-logix',
        },
        {
          icon: BookOpen,
          title: 'API 参考',
          description: '@logixjs/core 与 @logixjs/react。',
          href: '/api',
        },
      ] satisfies ReadonlyArray<NextStepItem>,
    },
    timeTravel: {
      title: '时间旅行调试',
      description:
        '不只是 Redux DevTools：记录完整执行 Trace，回滚状态，并在未来时间线中分叉与 Mock。',
      highlight: 'Trace → 回放 → 分叉',
      mockTitle: 'Trace（示意）',
      mockHint: '只展示结构：真实 Trace 可序列化、可解释、可回放。',
    },
    features: {
      title: '核心能力',
      description: '确定性运行 + 可观测 Trace，让规则与状态可组合、可调试。',
      items: [
        {
          icon: Code2,
          title: 'React 心智模型',
          description: '像写组件一样组织规则与状态，把行为组合成 Flow。',
        },
        {
          icon: History,
          title: '确定性执行',
          description: '稳定的执行顺序与标识，让问题可复现。',
        },
        {
          icon: GitGraph,
          title: '统一最小 IR',
          description: '声明降解为 Static IR 与 Dynamic Trace，驱动工具链。',
        },
        {
          icon: TimerReset,
          title: '可回放调试',
          description: '回放 Trace 定位问题，必要时分叉与 Mock 做 what-if。',
        },
        {
          icon: Puzzle,
          title: '模块隔离',
          description: '显式边界与事务窗口，避免脏读与隐式耦合。',
        },
        {
          icon: ShieldCheck,
          title: 'Effect 原生',
          description: '基于 Effect：错误、并发、上下文注入与资源管理。',
        },
      ] satisfies ReadonlyArray<FeatureItem>,
    },
    faq: {
      title: '常见问题',
      items: [
        {
          q: '它解决什么问题？',
          a: '把“规则/状态/副作用”组织成可组合的 Flow，并把运行过程收敛为可观测 Trace，使问题可解释、可复现、可回放。',
        },
        {
          q: '为什么强调确定性？',
          a: '同样输入得到同样输出与同样 Trace；这样诊断与回放才有可靠锚点，工具链才能建立稳定引用。',
        },
        {
          q: '和 Redux / XState 的关系？',
          a: 'Logix 更关注“Flow + 运行时契约 + Trace/回放”，并把并发/错误/资源管理交给 Effect，减少隐式约定。',
        },
      ],
    },
    finalCta: {
      title: '开始构建你的第一个 Flow',
      description: '从 Quick Start 跑通最小闭环，再逐步引入 Trace/回放与模块协作。',
      primaryCta: '进入文档',
      badge: '可回放 · 可解释 · 可组合',
    },
    footer: {
      brand: 'Logix Runtime',
      sourceHref: 'https://github.com/yoyooyooo/logix',
    },
  },
  en: {
    hero: {
      badge: 'Public Preview',
      title: 'Logix',
      slogan: 'React mental model for a deterministic, observable runtime',
      description:
        'Organize rules and state like components. Stable ordering, stable identities, observable runs with trace + replay.',
      docsCta: 'Read the Docs',
      sourceCta: 'View Source',
    },
    nextSteps: {
      title: 'Start here',
      description: 'Three quick entries to build a working mental model.',
      items: [
        {
          icon: Rocket,
          title: 'Quick Start',
          description: 'Build your first app with Modules, State, and Flows.',
          href: '/guide/get-started/quick-start',
        },
        {
          icon: Brain,
          title: 'Thinking in Logix',
          description: 'Understand rules and state with a React mental model.',
          href: '/guide/essentials/thinking-in-logix',
        },
        {
          icon: BookOpen,
          title: 'API Reference',
          description: '@logixjs/core and @logixjs/react.',
          href: '/api',
        },
      ] satisfies ReadonlyArray<NextStepItem>,
    },
    timeTravel: {
      title: 'Time-travel debugging',
      description:
        'Not just Redux DevTools: record full traces, roll back state, and fork + mock future timelines.',
      highlight: 'Trace → Replay → Fork',
      mockTitle: 'Trace (sketch)',
      mockHint: 'Structure only: real traces are serializable, explainable, and replayable.',
    },
    features: {
      title: 'Core capabilities',
      description: 'Deterministic execution with observable traces for composable rules and state.',
      items: [
        {
          icon: Code2,
          title: 'React mental model',
          description: 'Organize rules and state like components; compose behavior as flows.',
        },
        {
          icon: History,
          title: 'Deterministic execution',
          description: 'Stable ordering and stable identities make issues reproducible.',
        },
        {
          icon: GitGraph,
          title: 'Minimal IR',
          description: 'Declarations compile to Static IR + Dynamic Trace for tooling.',
        },
        {
          icon: TimerReset,
          title: 'Replay debugging',
          description: 'Replay traces, fork timelines, and mock what-if scenarios.',
        },
        {
          icon: Puzzle,
          title: 'Module scoping',
          description: 'Explicit boundaries prevent dirty reads and hidden coupling.',
        },
        {
          icon: ShieldCheck,
          title: 'Effect-native',
          description: 'Built on Effect: errors, concurrency, context, and resources.',
        },
      ] satisfies ReadonlyArray<FeatureItem>,
    },
    faq: {
      title: 'FAQ',
      items: [
        {
          q: 'What does it solve?',
          a: 'Compose “rules/state/effects” as flows and converge runs into observable traces, so issues become explainable, reproducible, and replayable.',
        },
        {
          q: 'Why deterministic?',
          a: 'Same input, same output, same trace. Diagnostics and replay need stable anchors; tooling needs stable references.',
        },
        {
          q: 'How is it different from Redux / XState?',
          a: 'Logix focuses on flow contracts + trace/replay, and delegates concurrency/errors/resources to Effect to reduce implicit conventions.',
        },
      ],
    },
    finalCta: {
      title: 'Ship your first flow',
      description: 'Start with Quick Start, then add trace/replay and module collaboration step by step.',
      primaryCta: 'Open Docs',
      badge: 'Replayable · Explainable · Composable',
    },
    footer: {
      brand: 'Logix Runtime',
      sourceHref: 'https://github.com/yoyooyooo/logix',
    },
  },
}
