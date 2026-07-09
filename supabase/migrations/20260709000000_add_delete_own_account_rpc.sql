-- Migrasi: Menambahkan RPC untuk menghapus akun mandiri

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer -- Penting agar function ini punya hak hapus dari auth.users
set search_path = public
as $$
declare
  _uid uuid;
begin
  _uid := auth.uid();
  
  if _uid is null then
    raise exception 'Tidak memiliki akses (Unauthenticated)';
  end if;

  -- Hapus user dari auth.users
  -- Tabel lain akan otomatis terhapus (ON DELETE CASCADE)
  delete from auth.users where id = _uid;
end;
$$;
