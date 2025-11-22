/**
 * Simple test to verify Jest setup is working
 */

describe('Basic Test Setup', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle async operations', async () => {
    const promise = Promise.resolve('hello')
    const result = await promise
    expect(result).toBe('hello')
  })

  it('should handle mock functions', () => {
    const mockFn = jest.fn()
    mockFn('test')
    expect(mockFn).toHaveBeenCalledWith('test')
  })
})