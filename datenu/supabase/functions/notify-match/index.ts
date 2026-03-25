import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    const payload = await req.json();
    const match = payload.record; // { id, couple_id, idea_id, ... }

    // Fetch the idea title
    const { data: idea } = await supabase
      .from('date_ideas')
      .select('title')
      .eq('id', match.idea_id)
      .single();

    if (!idea) return new Response('idea not found', { status: 404 });

    // Fetch both partners' push tokens
    const { data: couple } = await supabase
      .from('couples')
      .select('user_a_id, user_b_id')
      .eq('id', match.couple_id)
      .single();

    if (!couple) return new Response('couple not found', { status: 404 });

    const { data: users } = await supabase
      .from('users')
      .select('expo_push_token')
      .in('id', [couple.user_a_id, couple.user_b_id]);

    const tokens = (users ?? [])
      .map((u: any) => u.expo_push_token)
      .filter(Boolean);

    if (!tokens.length) return new Response('no push tokens', { status: 200 });

    // Send via Expo Push API
    const messages = tokens.map((token: string) => ({
      to: token,
      title: `💛 It's a match!`,
      body: `You both want to: ${idea.title}`,
      sound: 'default',
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
