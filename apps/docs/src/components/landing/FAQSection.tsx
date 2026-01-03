/*
[INPUT]
- copy: landingCopy[lang].faq
[OUTPUT]
- FAQ（Accordion；只用 tokens + shadcn/ui）
[POS]
- apps/docs：Landing/FAQ
*/

'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FAQCopy } from './content'

export function FAQSection({ copy }: { copy: FAQCopy }) {
  return (
    <section aria-labelledby="landing-faq-title" className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
      <Card>
        <CardHeader>
          <CardTitle id="landing-faq-title" className="text-2xl sm:text-3xl tracking-tight">
            {copy.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {copy.items.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </section>
  )
}
