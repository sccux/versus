import { generateInviteCode, createCouple, joinCoupleByCode, getMyCouple } from '@/lib/couples';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase';

describe('generateInviteCode', () => {
  it('returns a 6-character uppercase alphanumeric string', () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('generates unique codes on repeated calls', () => {
    const codes = new Set(Array.from({ length: 100 }, generateInviteCode));
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe('createCouple', () => {
  it('inserts a couple row with user_a_id and invite_code', async () => {
    const mockInsert = jest.fn().mockResolvedValue({
      data: { id: 'couple-1', invite_code: 'ABC123' },
      error: null,
    });
    const mockSelect = jest.fn().mockReturnValue({ single: () => mockInsert() });
    // getOrCreateCouple first checks for an existing unpaired couple, then inserts
    // Mock the select chain for getMyUnpairedCouple to return null (no existing)
    // then mock the insert chain for createCouple
    let callCount = 0;
    (supabase.from as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // getMyUnpairedCouple call
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      // insert call
      return { insert: jest.fn().mockReturnValue({ select: mockSelect }) };
    });

    const result = await createCouple('user-1');
    expect(supabase.from).toHaveBeenCalledWith('couples');
    expect(result).toMatchObject({ id: 'couple-1' });
  });
});

describe('joinCoupleByCode', () => {
  it('throws when code is not found', async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({ single: mockSingle }),
        }),
      }),
    });
    await expect(joinCoupleByCode('user-2', 'BADCODE')).rejects.toThrow('Invalid invite code');
  });
});
