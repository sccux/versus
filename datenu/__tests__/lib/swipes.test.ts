import { recordSwipe, getSwipedIdeaIds } from '@/lib/swipes';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
import { supabase } from '@/lib/supabase';

describe('recordSwipe', () => {
  it('inserts a swipe row with correct fields', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    await recordSwipe({
      coupleId: 'couple-1',
      userId: 'user-1',
      ideaId: 'idea-1',
      direction: 'like',
    });

    expect(supabase.from).toHaveBeenCalledWith('swipes');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        couple_id: 'couple-1',
        user_id: 'user-1',
        idea_id: 'idea-1',
        direction: 'like',
      })
    );
  });
});

describe('getSwipedIdeaIds', () => {
  it('returns idea ids already swiped by this user in this couple', async () => {
    const mockData = [{ idea_id: 'idea-1' }, { idea_id: 'idea-2' }];
    const mockEq = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: mockEq }),
    });

    const ids = await getSwipedIdeaIds('couple-1', 'user-1');
    expect(ids).toEqual(['idea-1', 'idea-2']);
  });
});
