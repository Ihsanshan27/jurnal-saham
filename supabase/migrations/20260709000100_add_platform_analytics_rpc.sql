-- Migrasi: Menambahkan RPC get_platform_analytics untuk dasbor admin
create or replace function public.get_platform_analytics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _total_users int;
  _active_30d int;
  _total_workspaces int;
  _total_trades bigint;
  _recent_activity jsonb;
  _result jsonb;
begin
  -- Pastikan pemanggil adalah admin
  if not public.is_admin() then
    raise exception 'Akses ditolak. Anda bukan admin.';
  end if;

  -- 1. Total Pengguna
  select count(*) into _total_users from public.profiles;
  
  -- 2. Pengguna Aktif (30 Hari Terakhir) berdasarkan interaksi di audit_logs
  select count(distinct actor_id) into _active_30d 
  from public.audit_logs 
  where created_at > now() - interval '30 days';
  
  -- 3. Total Workspace
  select count(*) into _total_workspaces from public.workspaces;
  
  -- 4. Total Transaksi (Trades)
  -- Mengasumsikan data_key = 'trades' menyimpan array JSON
  select coalesce(sum(
    case 
      when jsonb_typeof(data) = 'array' then jsonb_array_length(data)
      else 0 
    end
  ), 0) into _total_trades 
  from public.journal_data 
  where data_key = 'trades';

  -- 5. Aktivitas Terbaru (10 log terakhir)
  select coalesce(jsonb_agg(sub), '[]'::jsonb) into _recent_activity
  from (
    select a.action, a.created_at, p.display_name, p.email
    from public.audit_logs a
    left join public.profiles p on p.id = a.actor_id
    order by a.created_at desc
    limit 10
  ) sub;

  -- Susun JSON response
  _result := jsonb_build_object(
    'totalUsers', _total_users,
    'activeUsers30d', _active_30d,
    'totalWorkspaces', _total_workspaces,
    'totalTrades', _total_trades,
    'recentActivity', _recent_activity
  );

  return _result;
end;
$$;
