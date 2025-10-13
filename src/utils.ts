import type { ElementOf } from '@vueuse/core'

export function filledArray(length: number, value?: undefined): undefined[]
export function filledArray<T>(length: number, value: T): T[]
export function filledArray<T>(length: number, value: T): T[] {
  return new Array(length).fill(value)
}

export function appendOrAdd<D, K extends keyof D, V extends ElementOf<D[K]>>(
  dict: D,
  key: K,
  value: V,
) {
  if (!dict[key]) {
    dict[key] = [value] as D[K]
  } else {
    ;(dict[key] as V[]).push(value)
  }
}
