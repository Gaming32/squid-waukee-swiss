/*
 * MIT License
 *
 * Copyright (c) 2020 Corentin Girard
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Splits an array of objects based on their values at a given key.
 *
 * @param objects The array to split.
 * @param key The key of T.
 */
export function splitBy<
  T extends Record<string, unknown>,
  K extends keyof T,
  U extends Record<K, string | number>,
>(objects: U[], key: K): U[][] {
  const map = {} as Record<string | number, U[]>

  for (const obj of objects) {
    const commonValue = obj[key]

    if (!map[commonValue]) map[commonValue] = []

    map[commonValue].push(obj)
  }

  return Object.values(map)
}

/**
 * Splits an array of objects based on their values at a given key.
 * Objects without a value at the given key will be set under a `-1` index.
 *
 * @param objects The array to split.
 * @param key The key of T.
 */
export function splitByWithLeftovers<
  T extends Record<string, unknown>,
  K extends keyof T,
  U extends Record<K, string | number>,
>(objects: U[], key: K): U[][] {
  const map = {} as Record<string | number, U[]>

  for (const obj of objects) {
    const commonValue = obj[key] ?? '-1' // Object keys are converted to a string.

    if (!map[commonValue]) map[commonValue] = []

    map[commonValue].push(obj)
  }

  const withoutLeftovers = Object.entries(map)
    .filter(([key]) => key !== '-1')
    .map(([, value]) => value)

  const result = [...withoutLeftovers]
  result[-1] = map[-1]!
  return result
}

/**
 * Sorts the objects in the given array by a given key.
 *
 * @param array The array to sort.
 * @param key The key of T.
 */
export function sortBy<
  T extends Record<string, unknown>,
  K extends keyof T,
  U extends Record<K, number>,
>(array: U[], key: K): U[] {
  return [...array].sort((a, b) => a[key] - b[key])
}
