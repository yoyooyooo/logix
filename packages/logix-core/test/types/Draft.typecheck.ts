import type { Draft } from '../../src/Logic.js'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

type _primitive_number_is_number = Expect<Equal<Draft<number>, number>>
type _primitive_string_is_string = Expect<Equal<Draft<string>, string>>
type _primitive_boolean_is_boolean = Expect<Equal<Draft<boolean>, boolean>>

type _struct_field_is_writable = Expect<Equal<Draft<{ count: number }>['count'], number>>
type _optional_field_keeps_undefined = Expect<Equal<Draft<{ count?: number }>['count'], number | undefined>>

type _record_index_is_value = Expect<Equal<Draft<Record<string, number>>[string], number>>

type _array_item_is_item = Expect<Equal<Draft<{ items: ReadonlyArray<number> }>['items'][number], number>>
