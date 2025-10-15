import Decimal from 'decimal.js'

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

export const D = (v: number | string) => new Decimal(v)

export function add(a: number | string, b: number | string) { return D(a).plus(b) }
export function sub(a: number | string, b: number | string) { return D(a).minus(b) }
export function mul(a: number | string, b: number | string) { return D(a).times(b) }
export function div(a: number | string, b: number | string) { return D(a).div(b) }
export function toFixed(val: number | string, dp = 8) { return D(val).toFixed(dp) }
export function toNumber(val: number | string) { return D(val).toNumber() }