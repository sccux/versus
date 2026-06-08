import { shouldAwardToken } from '@/lib/tokens'

describe('shouldAwardToken', () => {
  it('returns false for vote counts that are not multiples of 20', () => {
    expect(shouldAwardToken(1)).toBe(false)
    expect(shouldAwardToken(19)).toBe(false)
    expect(shouldAwardToken(21)).toBe(false)
  })

  it('returns true when vote count reaches a multiple of 20', () => {
    expect(shouldAwardToken(20)).toBe(true)
    expect(shouldAwardToken(40)).toBe(true)
    expect(shouldAwardToken(100)).toBe(true)
  })

  it('returns false for 0', () => {
    expect(shouldAwardToken(0)).toBe(false)
  })
})
