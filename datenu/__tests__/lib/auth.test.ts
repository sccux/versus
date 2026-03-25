import { createUserProfile, signOut, getSession } from '@/lib/auth';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      upsert: jest.fn(() => ({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })),
      })),
    })),
  },
}));

import { supabase } from '@/lib/supabase';

describe('createUserProfile', () => {
  it('upserts a user row with the correct fields', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ upsert: mockUpsert });

    await createUserProfile({
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      authProvider: 'email',
    });

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        email: 'test@example.com',
        display_name: 'Test User',
        auth_provider: 'email',
      }),
      { onConflict: 'id' }
    );
  });
});

describe('signOut', () => {
  it('calls supabase.auth.signOut', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    await signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
