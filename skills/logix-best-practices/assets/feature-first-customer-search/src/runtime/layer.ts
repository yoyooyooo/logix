import { Effect, Layer } from 'effect'
import { CustomerApiTag, CustomerSearchError } from '../features/customer-search/service.js'

export const RuntimeLayer = Layer.succeed(CustomerApiTag, {
  search: (keyword: string) => {
    if (keyword.includes('!')) {
      return Effect.fail(new CustomerSearchError({ message: 'keyword 含非法字符：!' }))
    }

    return Effect.succeed([
      { id: 'c_1', name: `客户：${keyword} / 1` },
      { id: 'c_2', name: `客户：${keyword} / 2` },
    ])
  },
})

