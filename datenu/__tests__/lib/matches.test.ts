import {
  getMatchesForCouple,
  scheduleMatch,
  completeMatch,
} from '@/lib/matches';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
import { supabase } from '@/lib/supabase';

describe('getMatchesForCouple', () => {
  it('queries matches joined with ideas', async () => {
    const data = [{ id: 'match-1', status: 'pending', idea_id: 'idea-1' }];
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(chain);
    const result = await getMatchesForCouple('couple-1');
    expect(supabase.from).toHaveBeenCalledWith('matches');
    expect(result).toEqual(data);
  });
});

describe('scheduleMatch', () => {
  it('upserts a scheduled_dates row and updates match status to scheduled', async () => {
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: null }) };
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(upsertChain)
      .mockReturnValueOnce(updateChain);

    await scheduleMatch({ matchId: 'match-1', scheduledAt: new Date('2026-04-01T19:00:00Z') });

    expect(supabase.from).toHaveBeenCalledWith('scheduled_dates');
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ match_id: 'match-1' }),
      { onConflict: 'match_id' }
    );
    expect(supabase.from).toHaveBeenCalledWith('matches');
    expect(updateChain.update).toHaveBeenCalledWith({ status: 'scheduled' });
  });
});

describe('completeMatch', () => {
  it('inserts a memory row and updates match status to completed', async () => {
    const insertChain = { insert: jest.fn().mockResolvedValue({ error: null }) };
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(updateChain);

    await completeMatch({ matchId: 'match-1', rating: 5, note: 'Amazing!' });

    expect(supabase.from).toHaveBeenCalledWith('date_memories');
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ match_id: 'match-1', rating: 5, note: 'Amazing!' })
    );
  });
});
