import { isSupabaseConfigured, supabase } from '@/modules/shared/services/supabaseClient';
import { isMissingDatabaseSetupError } from '@/modules/shared/utils/errorMessages';

export interface SystemBroadcast {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  createdAt: string;
}

export async function getSystemBroadcasts(): Promise<SystemBroadcast[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'system_broadcasts')
    .maybeSingle();

  if (error) {
    if (isMissingDatabaseSetupError(error)) return [];
    console.error('Failed to fetch broadcasts:', error);
    return [];
  }
  
  return Array.isArray(data?.value) ? data.value : [];
}

export async function pushSystemBroadcast(broadcast: Omit<SystemBroadcast, 'id' | 'createdAt'>, userId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const currentBroadcasts = await getSystemBroadcasts();
  
  const newBroadcast: SystemBroadcast = {
    ...broadcast,
    id: `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  // Keep only the latest 20 broadcasts to avoid blowing up the app_settings value size
  const updatedBroadcasts = [newBroadcast, ...currentBroadcasts].slice(0, 20);

  const { error } = await supabase
    .from('app_settings')
    .upsert({
      key: 'system_broadcasts',
      value: updatedBroadcasts,
      updated_by: userId,
    }, { onConflict: 'key' });

  if (error) throw error;
}
