import { LandingPage } from '@/components/landing/LandingPage'

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  return <LandingPage lang={lang === 'cn' ? 'cn' : 'en'} />
}
