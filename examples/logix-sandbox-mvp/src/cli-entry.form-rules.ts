import { Schema } from 'effect'
import * as Form from '@logixjs/form'

const Values = Schema.Struct({ name: Schema.String })
const R = Form.rules(Values)

export const AppRoot = Form.make('CliPlayground.FormRules', {
  values: Values,
  initialValues: { name: '' },
  rules: R(R.field('name', { required: true })),
})

