import { add, mul, toFixed, toNumber, D } from '@/lib/decimal'

describe('decimal math helpers', () => {
  test('0.1 + 0.2 equals 0.3 with Decimal', () => {
    const sum = add(0.1, 0.2)
    expect(sum.equals(D(0.3))).toBe(true)
  })

  test('precise multiplication and rounding', () => {
    const price = 12345.67890123
    const amount = 0.00012345
    const total = mul(price, amount)
    expect(toFixed(total, 8)).toBe('1.52408')
  })

  test('toNumber returns a JS number for supabase writes', () => {
    const n = toNumber(mul(0.1, 0.2))
    expect(typeof n).toBe('number')
  })
})
