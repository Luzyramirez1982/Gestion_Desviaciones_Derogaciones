-- Tablas que usa el aplicativo Gestión de Desviaciones y Derogaciones MATEC.
-- Pegar completo en Supabase > SQL Editor > New query y presionar "Run".
-- Se puede ejecutar más de una vez sin error y no borra datos.
-- Actualizado el 25/10/2026: ingreso con usuario y contraseña (Supabase Auth)
-- y huella de los registros eliminados por el Administrador.

create table if not exists registros (
  id text primary key,
  data jsonb not null
);

create table if not exists usuarios (
  id text primary key,
  data jsonb not null
);

create table if not exists tipos_desviacion (
  id text primary key,
  area text not null,
  data jsonb not null
);

-- Configuración editable desde el aplicativo (áreas y enlace de acceso).
create table if not exists configuracion (
  id text primary key,
  data jsonb not null
);

-- Huella de auditoría: quién eliminó cada registro, cuándo, por qué y una copia del registro.
create table if not exists registros_eliminados (
  id text primary key,
  data jsonb not null,
  creado_en timestamptz not null default now()
);

alter table registros enable row level security;
alter table usuarios enable row level security;
alter table tipos_desviacion enable row level security;
alter table configuracion enable row level security;
alter table registros_eliminados enable row level security;

-- Políticas anteriores (acceso anónimo): se eliminan.
drop policy if exists "acceso_anon_registros" on registros;
drop policy if exists "acceso_anon_usuarios" on usuarios;
drop policy if exists "acceso_anon_tipos" on tipos_desviacion;
drop policy if exists "acceso_anon_config" on configuracion;

-- Desde ahora solo los usuarios que ingresaron con correo y contraseña pueden leer y escribir.
drop policy if exists "acceso_auth_registros" on registros;
drop policy if exists "acceso_auth_usuarios" on usuarios;
drop policy if exists "acceso_auth_tipos" on tipos_desviacion;
drop policy if exists "acceso_auth_config" on configuracion;
drop policy if exists "auditoria_leer" on registros_eliminados;
drop policy if exists "auditoria_insertar" on registros_eliminados;
drop policy if exists "auditoria_actualizar" on registros_eliminados;

create policy "acceso_auth_registros" on registros for all to authenticated using (true) with check (true);
create policy "acceso_auth_usuarios" on usuarios for all to authenticated using (true) with check (true);
create policy "acceso_auth_tipos" on tipos_desviacion for all to authenticated using (true) with check (true);
create policy "acceso_auth_config" on configuracion for all to authenticated using (true) with check (true);

-- La huella se puede leer, crear y marcar como restaurada, pero NO borrar desde el aplicativo.
create policy "auditoria_leer" on registros_eliminados for select to authenticated using (true);
create policy "auditoria_insertar" on registros_eliminados for insert to authenticated with check (true);
create policy "auditoria_actualizar" on registros_eliminados for update to authenticated using (true) with check (true);

revoke all on registros, usuarios, tipos_desviacion, configuracion, registros_eliminados from anon;
grant select, insert, update, delete on registros, usuarios, tipos_desviacion, configuracion to authenticated;
grant select, insert, update on registros_eliminados to authenticated;
