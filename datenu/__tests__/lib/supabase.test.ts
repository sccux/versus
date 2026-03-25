import { supabase } from '@/lib/supabase';

describe('supabase client', () => {
  it('is a singleton', async () => {
    const { supabase: second } = await import('@/lib/supabase');
    expect(supabase).toBe(second);
  });

  it('exposes auth', () => {
    expect(supabase.auth).toBeDefined();
  });
});
