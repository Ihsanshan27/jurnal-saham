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
    if (profile?.default_role !== 'admin') throw new Error('Hanya admin yang bisa update user.');

    const body = await req.json();
    const userId = String(body.userId || '').trim();
    const email = body.email ? String(body.email).trim().toLowerCase() : undefined;
    const displayName = body.displayName ? String(body.displayName).trim() : undefined;

    if (!userId) throw new Error('userId tidak valid.');

    const updateAuthData = {};
    if (email) updateAuthData.email = email;
    if (displayName) updateAuthData.user_metadata = { display_name: displayName };

    if (Object.keys(updateAuthData).length > 0) {
      const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(userId, updateAuthData);
      if (updateError) throw updateError;
    }

    const updateProfileData = {};
    if (email) updateProfileData.email = email;
    if (displayName) updateProfileData.display_name = displayName;

    if (Object.keys(updateProfileData).length > 0) {
      const { error: profileUpsertError } = await adminClient
        .from('profiles')
        .update(updateProfileData)
        .eq('id', userId);

      if (profileUpsertError) throw profileUpsertError;
    }

    await adminClient
      .from('audit_logs')
      .insert({
        actor_id: authData.user.id,
        action: 'auth.user_updated',
        target_type: 'profile',
        target_id: userId,
        metadata: { email, displayName },
      });

    return new Response(JSON.stringify({ success: true, message: 'User berhasil diupdate.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
