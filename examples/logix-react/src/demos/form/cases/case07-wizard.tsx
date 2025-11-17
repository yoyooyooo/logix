import React from 'react'
import { Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule, useSelector } from '@logix/react'
import * as Form from '@logix/form'
import { useField } from '@logix/form/react'
import type { FormCaseLink } from './types'
import { JsonCard, SectionTitle, TextField, PrimaryButton, GhostButton } from './shared'

const WizardValues = Schema.Struct({
  step: Schema.Literal(1, 2, 3),
  companyName: Schema.String,
  taxId: Schema.String,
  bankAccount: Schema.String,
  contactName: Schema.String,
  contactEmail: Schema.String,
})

type WizardV = Schema.Schema.Type<typeof WizardValues>

const wizardInitialValues: WizardV = {
  step: 1,
  companyName: '',
  taxId: '',
  bankAccount: '',
  contactName: '',
  contactEmail: '',
}

const $ = Form.from(WizardValues)
const z = $.rules

const WizardForm = Form.make('FormCase.Wizard', {
  values: WizardValues,
  validateOn: ['onBlur'],
  reValidateOn: ['onBlur'],
  initialValues: wizardInitialValues,
  rules: z(
    z.field('companyName', { required: '公司名称必填' }),
    z.field('taxId', { required: '税号必填' }),
    z.field('bankAccount', { required: '开户账号必填' }),
    z.field('contactName', { required: '联系人必填' }),
    z.field('contactEmail', {
      required: '邮箱必填',
      validate: (v) => (String(v ?? '').includes('@') ? undefined : '邮箱格式不正确'),
    }),
  ),
})

const runtime = Logix.Runtime.make(WizardForm, {
  label: 'FormCase.Wizard',
  devtools: true,
})

const WizardCase: React.FC = () => {
  const form = useModule(WizardForm)
  const state = useSelector(form) as any

  const companyName = useField(form, 'companyName')
  const taxId = useField(form, 'taxId')
  const bankAccount = useField(form, 'bankAccount')
  const contactName = useField(form, 'contactName')
  const contactEmail = useField(form, 'contactEmail')

  const step = Number(state?.step ?? 1) as 1 | 2 | 3

  const setStep = (next: 1 | 2 | 3) => form.actions.setValue({ path: 'step', value: next })

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Case 07 · 分步向导"
        desc="wizard 只是 values 的一种组织方式；校验/错误树仍走同一套 TraitLifecycle 入口。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Step {step}/3</div>
              <div className="flex gap-2">
                <GhostButton type="button" onClick={() => setStep(Math.max(1, step - 1) as any)} disabled={step === 1}>
                  上一步
                </GhostButton>
                <GhostButton type="button" onClick={() => setStep(Math.min(3, step + 1) as any)} disabled={step === 3}>
                  下一步
                </GhostButton>
                <PrimaryButton type="button" onClick={() => form.actions.submit()}>
                  提交全量校验
                </PrimaryButton>
              </div>
            </div>

            {step === 1 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="公司名称"
                  value={companyName.value}
                  error={companyName.error}
                  touched={companyName.touched}
                  dirty={companyName.dirty}
                  onChange={(next) => companyName.onChange(next)}
                  onBlur={companyName.onBlur}
                />
                <TextField
                  label="税号"
                  value={taxId.value}
                  error={taxId.error}
                  touched={taxId.touched}
                  dirty={taxId.dirty}
                  onChange={(next) => taxId.onChange(next)}
                  onBlur={taxId.onBlur}
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="开户账号"
                  value={bankAccount.value}
                  error={bankAccount.error}
                  touched={bankAccount.touched}
                  dirty={bankAccount.dirty}
                  onChange={(next) => bankAccount.onChange(next)}
                  onBlur={bankAccount.onBlur}
                />
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="联系人"
                  value={contactName.value}
                  error={contactName.error}
                  touched={contactName.touched}
                  dirty={contactName.dirty}
                  onChange={(next) => contactName.onChange(next)}
                  onBlur={contactName.onBlur}
                />
                <TextField
                  label="联系人邮箱"
                  value={contactEmail.value}
                  error={contactEmail.error}
                  touched={contactEmail.touched}
                  dirty={contactEmail.dirty}
                  onChange={(next) => contactEmail.onChange(next)}
                  onBlur={contactEmail.onBlur}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <JsonCard title="values" value={state} />
          <JsonCard title="errors" value={state?.errors} />
          <JsonCard title="ui" value={state?.ui} />
        </div>
      </div>
    </div>
  )
}

const WizardPage: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <React.Suspense fallback={<div>加载中…</div>}>
      <WizardCase />
    </React.Suspense>
  </RuntimeProvider>
)

export const case07Wizard: FormCaseLink = {
  id: '07',
  title: '分步向导',
  to: 'wizard',
  desc: 'wizard + submit validate',
  element: <WizardPage />,
}
