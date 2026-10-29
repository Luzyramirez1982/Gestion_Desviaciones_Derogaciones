-- BASE DE DATOS v2 · Actualización en vivo (Realtime).
--
-- Ejecutar DESPUÉS de 0005. Hace que la tabla "registros" avise a la aplicación cuando alguien la cambia,
-- para que varias personas vean los cambios sin recargar la página.
--
-- Es seguro ejecutarlo más de una vez. Si la base no tiene la publicación "supabase_realtime"
-- (por ejemplo, en la base de prueba local), no hace nada y no da error.
-- Los avisos respetan los permisos de lectura: cada persona solo recibe cambios de registros que puede ver.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'registros') then
    alter publication supabase_realtime add table public.registros;
  end if;
end $$;
