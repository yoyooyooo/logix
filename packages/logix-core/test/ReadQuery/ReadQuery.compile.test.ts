import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import * as Logix from '../../src/index.js'

describe('ReadQuery.compile', () => {
  it('parses simple path selector', () => {
    const selector = (s: { count: number }) => s.count
    const a = Logix.ReadQuery.compile(selector)
    const b = Logix.ReadQuery.compile(selector)

    expect(a.lane).toBe('static')
    expect(a.producer).toBe('jit')
    expect(a.reads).toEqual(['count'])
    expect(a.equalsKind).toBe('objectIs')

    expect(a.selectorId).toBe(b.selectorId)
    expect(a.readsDigest).toEqual(b.readsDigest)

    expect(a.staticIr).toMatchObject({
      selectorId: a.selectorId,
      lane: 'static',
      producer: 'jit',
      equalsKind: 'objectIs',
    })
    expect(a.staticIr.readsDigest?.count).toBe(1)
    expect(typeof a.staticIr.readsDigest?.hash).toBe('number')
  })

  it('parses function form selector (function (s) { return s.a })', () => {
    function selectCount(s: { count: number }) {
      return s.count
    }

    const a = Logix.ReadQuery.compile(selectCount)
    const b = Logix.ReadQuery.compile(selectCount)

    expect(a.lane).toBe('static')
    expect(a.producer).toBe('jit')
    expect(a.reads).toEqual(['count'])
    expect(a.equalsKind).toBe('objectIs')

    expect(a.selectorId).toBe(b.selectorId)
    expect(a.readsDigest).toEqual(b.readsDigest)
  })

  it('parses function form struct selector and marks shallowStruct', () => {
    function selectStruct(s: { count: number; age: number }) {
      return { count: s.count, age: s.age }
    }

    const rq = Logix.ReadQuery.compile(selectStruct)

    expect(rq.lane).toBe('static')
    expect(rq.producer).toBe('jit')
    expect(rq.equalsKind).toBe('shallowStruct')
    expect(rq.reads).toEqual(['age', 'count'])
    expect(rq.staticIr.equalsKind).toBe('shallowStruct')
  })

  it('parses struct selector and marks shallowStruct', () => {
    const selector = (s: { count: number; age: number }) => ({ count: s.count, age: s.age })
    const rq = Logix.ReadQuery.compile(selector)

    expect(rq.lane).toBe('static')
    expect(rq.producer).toBe('jit')
    expect(rq.equalsKind).toBe('shallowStruct')
    expect(rq.reads).toEqual(['age', 'count'])
    expect(rq.staticIr.equalsKind).toBe('shallowStruct')
  })

  it('falls back to dynamic lane when unsupported', () => {
    const selector = (s: { count: number }) => (s.count > 0 ? s.count : 0)
    const rq = Logix.ReadQuery.compile(selector)

    expect(rq.lane).toBe('dynamic')
    expect(rq.producer).toBe('dynamic')
    expect(['missingDeps', 'unsupportedSyntax']).toContain(rq.fallbackReason)
    expect(rq.staticIr.fallbackReason).toBe(rq.fallbackReason)
  })
})
