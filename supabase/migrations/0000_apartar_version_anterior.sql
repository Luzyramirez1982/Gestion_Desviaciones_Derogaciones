-- BASE DE DATOS v2 · Gestión de Desviaciones y Derogaciones MATEC
-- Paso 0: apartar las tablas de la versión anterior (si existen).
--
-- Ejecutar PRIMERO, antes que 0001. Es seguro ejecutarlo varias veces y no borra datos.
--
-- La versión anterior ya tenía tablas llamadas "registros", "usuarios", "tipos_desviacion",
-- "configuracion" y "registros_eliminados". La versión nueva usa algunos de esos mismos nombres
-- con otra estructura, así que las viejas se renombran con el sufijo _v1 y se conservan intactas
-- para migrar sus datos. Quedan cerradas: ni la aplicación ni ninguna persona con sesión puede
-- leerlas ni cambiarlas (solo el administrador de la base de datos, desde Supabase).
--
-- Si el proyecto de Supabase es nuevo y no tiene esas tablas, este archivo no hace nada.

do $$
declare
  t text;
  pol record;
begin
  -- La tabla "registros" de la versión anterior solo tiene (id, data); la nueva tiene tipo_gestion.
  if to_regclass('public.registros') is not null
     and not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'registros' and column_name = 'tipo_gestion') then
    foreach t in array array['registros', 'usuarios', 'tipos_desviacion', 'configuracion', 'registros_eliminados'] loop
      if to_regclass('public.' || t) is not null and to_regclass('public.' || t || '_v1') is null then
        execute format('alter table public.%I rename to %I', t, t || '_v1');
        -- el nombre de la llave primaria también se cambia para que no choque con las tablas nuevas
        if exists (select 1 from pg_constraint where conname = t || '_pkey' and conrelid = ('public.' || t || '_v1')::regclass) then
          execute format('alter table public.%I rename constraint %I to %I', t || '_v1', t || '_pkey', t || '_v1_pkey');
        end if;
      end if;
    end loop;
  end if;

  -- Se cierran las tablas _v1: sin permisos y sin políticas para nadie con sesión.
  foreach t in array array['registros_v1', 'usuarios_v1', 'tipos_desviacion_v1', 'configuracion_v1', 'registros_eliminados_v1'] loop
    if to_regclass('public.' || t) is not null then
      for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on public.%I', pol.policyname, t);
      end loop;
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on public.%I from public, anon, authenticated', t);
    end if;
  end loop;
end $$;
