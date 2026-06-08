jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}))

import { createServiceClient } from '@/lib/supabase/server'
import { getVoteCounts } from '@/lib/votes'

describe('getVoteCounts', () => {
  it('returns zero counts when no votes exist', async () => {
    ;(createServiceClient as jest.Mock).mockReturnValue({
      from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
    })
    const counts = await getVoteCounts('comp-1')
    expect(counts).toEqual({ a: 0, b: 0 })
  })

  it('counts a and b votes correctly', async () => {
    ;(createServiceClient as jest.Mock).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({
            data: [{ choice: 'a' }, { choice: 'a' }, { choice: 'b' }],
            error: null,
          }),
        }),
      }),
    })
    const counts = await getVoteCounts('comp-1')
    expect(counts).toEqual({ a: 2, b: 1 })
  })
})
