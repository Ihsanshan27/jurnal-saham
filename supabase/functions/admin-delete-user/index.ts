// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Supabase function environment belum lengkap.');
    }

    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) throw new Error('User belum login.');

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('default_role')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw profileError;
    if (profile?.default_role !== 'admin') throw new Error('Hanya admin yang bisa menghapus user.');

    const body = await req.json();
    const userId = String(body.userId || '').trim();

    if (!userId) throw new Error('userId tidak valid.');
    if (userId === authData.user.id) throw new Error('Tidak bisa menghapus akun sendiri.');

    // Note: If there are foreign keys restricted, this might fail, 
    // but typically profiles cascades or we delete it first. Let's delete profile first if it doesn't cascade.
    // Actually, deleting auth user usually cascades to public.profiles if set up correctly.
    // We will delete auth user.
    const { data: deleteData, error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) throw deleteError;

    // Delete profile just in case it doesn't cascade
    await adminClient.from('profiles').delete().eq('id', userId);

    await adminClient
      .from('audit_logs')
      .insert({
        actor_id: authData.user.id,
        action: 'auth.user_deleted',
        target_type: 'profile',
        target_id: userId,
        metadata: {},
      });

    return new Response(JSON.stringify({ success: true, message: 'User berhasil dihapus.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
