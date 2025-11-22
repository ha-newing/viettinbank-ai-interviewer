/**
 * Mock implementation of nanoid for Jest tests
 */

let counter = 0

export function nanoid(size = 21): string {
  // Generate a deterministic ID for tests
  counter++
  return `test-id-${counter.toString().padStart(size - 8, '0')}`
}

export function customAlphabet(alphabet: string, defaultSize: number) {
  return (size = defaultSize) => nanoid(size)
}

// Default export compatibility
export default nanoid