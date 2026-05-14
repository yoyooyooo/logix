import type { LucideIcon } from 'lucide-react'
import { BookOpen, Brain, Code2, GitGraph, History, Puzzle, Rocket, ShieldCheck, TimerReset } from 'lucide-react'

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
      badge: '当前文档路线',
      title: 'Logix',
      slogan: 'React 的逻辑半边',
      description:
        '用 Module 声明逻辑，用 Program 装配业务单元，用 Runtime 执行，再通过 React host 精确读取。文档从这条主链展开，不要求用户学习内部 trait 或 field-kernel 体系。',
      docsCta: '阅读文档',
      sourceCta: '查看源码',
    },
    nextSteps: {
      title: '先跑通主链',
      description: '从一个 Program 开始，再进入核心概念和 API 参考。',
      items: [
        {
          icon: Rocket,
          title: '快速开始',
          description: '创建 Program，在 React 中挂载并读写状态。',
          href: '/guide/get-started/quick-start',
        },
        {
          icon: Brain,
          title: 'Canonical spine',
          description: '固定 Module、Program、Runtime 和 React host 的角色。',
          href: '/guide/essentials/canonical-spine',
        },
        {
          icon: BookOpen,
          title: 'API',
          description: 'Core、React 和生成的签名参考。',
          href: '/api',
        },
      ] satisfies ReadonlyArray<NextStepItem>,
    },
    timeTravel: {
      title: '运行证据',
      description:
        'Logix 的 diagnostics 和 verification 面向真实执行：run、check、trial 和 report 描述同一个 runtime 边界下发生的事。',
      highlight: 'run → check → trial',
      mockTitle: 'Report（示意）',
      mockHint: '结构优先：报告用于解释装配、依赖、执行和诊断结果。',
    },
    features: {
      title: '公开模型',
      description: '小公开面、明确 owner、Effect-native 执行和 React 精确读取。',
      items: [
        {
          icon: Code2,
          title: 'Module.logic',
          description: '在定义阶段声明逻辑、ready gate、字段行为和运行入口。',
        },
        {
          icon: GitGraph,
          title: 'Program.make',
          description: '在装配阶段确定初始状态、imports 和 declaration assets。',
        },
        {
          icon: History,
          title: 'Runtime.make',
          description: '执行、服务、生命周期、事务和 diagnostics 都在 runtime 内闭合。',
        },
        {
          icon: TimerReset,
          title: 'Runtime.check / trial',
          description: '验证和试运行返回结构化报告，而不是临时日志。',
        },
        {
          icon: Puzzle,
          title: 'React host',
          description: 'RuntimeProvider 提供宿主边界，useModule 与 useSelector 负责实例和读取。',
        },
        {
          icon: ShieldCheck,
          title: 'Form DSL',
          description: 'Form 处理字段、规则、source、companion、submit 与列表身份。',
        },
      ] satisfies ReadonlyArray<FeatureItem>,
    },
    faq: {
      title: '常见问题',
      items: [
        {
          q: 'traits 还需要用户理解吗？',
          a: '不需要。当前用户路线讲行为和 owner 边界；内部 trait、field-kernel、compiler asset 不再作为正面教学概念。',
        },
        {
          q: '为什么一定要 Program？',
          a: 'Program 是装配边界。它把 Module 定义、初始状态、imports 和 declarations 收成 runtime 可执行的业务单元。',
        },
        {
          q: 'React 文档为什么这么少？',
          a: 'React 只持有宿主投影：Provider、实例获取、selector 读取和 dispatch。更多业务语义留在 core 或领域 DSL。',
        },
      ],
    },
    finalCta: {
      title: '从第一个 Program 开始',
      description: '先跑通 Module → Program → Runtime → React，再按需要进入 Form、patterns 和 advanced。',
      primaryCta: '进入文档',
      badge: 'Module · Program · Runtime · React',
    },
    footer: {
      brand: 'Logix Runtime',
      sourceHref: 'https://github.com/yoyooyooo/logix',
    },
  },
  en: {
    hero: {
      badge: 'Current docs route',
      title: 'Logix',
      slogan: 'The logic half of React',
      description:
        'Declare logic with Module, assemble a business unit with Program, execute it with Runtime, and project precise reads into React. The docs expand from that spine; users do not need the internal trait or field-kernel system.',
      docsCta: 'Read the Docs',
      sourceCta: 'View Source',
    },
    nextSteps: {
      title: 'Run the spine first',
      description: 'Start with one Program, then move into the core model and API reference.',
      items: [
        {
          icon: Rocket,
          title: 'Quick Start',
          description: 'Create a Program, mount it in React, and read/write state.',
          href: '/guide/get-started/quick-start',
        },
        {
          icon: Brain,
          title: 'Canonical spine',
          description: 'Fix the roles of Module, Program, Runtime, and the React host.',
          href: '/guide/essentials/canonical-spine',
        },
        {
          icon: BookOpen,
          title: 'API',
          description: 'Core, React, and generated signature reference.',
          href: '/api',
        },
      ] satisfies ReadonlyArray<NextStepItem>,
    },
    timeTravel: {
      title: 'Runtime evidence',
      description:
        'Logix diagnostics and verification describe real execution: run, check, trial, and report all stay on the same runtime boundary.',
      highlight: 'run → check → trial',
      mockTitle: 'Report (sketch)',
      mockHint: 'Structure first: reports explain assembly, dependencies, execution, and diagnostics.',
    },
    features: {
      title: 'Public model',
      description: 'A small public surface with explicit owners, Effect-native execution, and precise React reads.',
      items: [
        {
          icon: Code2,
          title: 'Module.logic',
          description: 'Declare logic, ready gates, field behavior, and run entries at definition time.',
        },
        {
          icon: GitGraph,
          title: 'Program.make',
          description: 'Assemble initial state, imports, and declaration assets into a business unit.',
        },
        {
          icon: History,
          title: 'Runtime.make',
          description: 'Execution, services, lifecycle, transactions, and diagnostics close inside runtime.',
        },
        {
          icon: TimerReset,
          title: 'Runtime.check / trial',
          description: 'Verification and trials return structured reports instead of incidental logs.',
        },
        {
          icon: Puzzle,
          title: 'React host',
          description: 'RuntimeProvider provides the host boundary; useModule and useSelector handle instances and reads.',
        },
        {
          icon: ShieldCheck,
          title: 'Form DSL',
          description: 'Form owns fields, rules, sources, companion facts, submit, and list identity.',
        },
      ] satisfies ReadonlyArray<FeatureItem>,
    },
    faq: {
      title: 'FAQ',
      items: [
        {
          q: 'Do users need traits?',
          a: 'No. The current user route explains behavior and owner boundaries; internal traits, field-kernel, and compiler assets are not front-door concepts.',
        },
        {
          q: 'Why does Program exist?',
          a: 'Program is the assembly boundary. It turns Module definitions, initial state, imports, and declarations into a runtime-executable business unit.',
        },
        {
          q: 'Why is the React API small?',
          a: 'React only owns host projection: provider, instance acquisition, selector reads, and dispatch. Business semantics stay in core or domain DSLs.',
        },
      ],
    },
    finalCta: {
      title: 'Start with the first Program',
      description: 'Run Module → Program → Runtime → React, then add Form, patterns, and advanced topics as needed.',
      primaryCta: 'Open Docs',
      badge: 'Module · Program · Runtime · React',
    },
    footer: {
      brand: 'Logix Runtime',
      sourceHref: 'https://github.com/yoyooyooo/logix',
    },
  },
}
