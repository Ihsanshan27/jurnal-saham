import { supabase } from '@/modules/shared/services/supabaseClient';

export async function createUserAsAdmin({ email, password, displayName, role }) {
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: {
      email,
      password,
      displayName,
      role,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.user;
}

export async function resetUserPasswordAsAdmin(userId: string, newPassword: string) {
  const { data, error } = await supabase.functions.invoke('admin-reset-password', {
    body: {
      userId,
      newPassword,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function deleteUserAsAdmin(userId: string) {
  const { data, error } = await supabase.functions.invoke('admin-delete-user', {
    body: { userId },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function updateUserAsAdmin(userId: string, updates: { email?: string; displayName?: string }) {
  const { data, error } = await supabase.functions.invoke('admin-update-user', {
    body: {
      userId,
      ...updates,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
