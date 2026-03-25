import { getIdeasForCouple } from '@/lib/ideas';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
import { supabase } from '@/lib/supabase';

describe('getIdeasForCouple', () => {
  it('queries approved ideas filtered by location', async () => {
    const mockData = [{ id: 'idea-1', title: 'Sunset Hike', is_approved: true }];
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockQuery);

    const result = await getIdeasForCouple({
      coupleId: 'couple-1',
      locationRegion: 'Copenhagen',
      seenIdeaIds: [],
    });

    expect(supabase.from).toHaveBeenCalledWith('date_ideas');
    expect(result).toHaveLength(1);
  });

  it('excludes already-swiped idea IDs', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockQuery);

    await getIdeasForCouple({
      coupleId: 'couple-1',
      locationRegion: 'Copenhagen',
      seenIdeaIds: ['idea-1', 'idea-2'],
    });

    expect(mockQuery.not).toHaveBeenCalledWith('id', 'in', '("idea-1","idea-2")');
  });
});
