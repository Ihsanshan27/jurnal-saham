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
    if (profile?.default_role !== 'admin') throw new Error('Hanya admin yang bisa reset password user.');

    const body = await req.json();
    const userId = String(body.userId || '').trim();
    const newPassword = String(body.newPassword || '');

    if (!userId) throw new Error('userId tidak valid.');
    if (newPassword.length < 6) throw new Error('Password minimal 6 karakter.');

    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateError) throw updateError;
    if (!updateData.user) throw new Error('Gagal reset password user.');

    await adminClient
      .from('audit_logs')
      .insert({
        actor_id: authData.user.id,
        action: 'auth.user_password_reset',
        target_type: 'profile',
        target_id: userId,
        metadata: {},
      });

    return new Response(JSON.stringify({ success: true, message: 'Password berhasil direset.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
