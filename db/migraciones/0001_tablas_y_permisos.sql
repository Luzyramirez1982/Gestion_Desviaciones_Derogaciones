-- BASE DE DATOS v2 · Gestión de Desviaciones y Derogaciones MATEC
-- Paso 1 de 2: tablas y permisos.
--
-- Cómo usarlo: se aplica con scripts/aplicar-migraciones.mjs (o pegando cada archivo en Neon > SQL Editor).
-- Hacerlo primero en una rama de pruebas de Neon, nunca directo en la base real.
--
-- Qué cambia frente a la versión anterior:
--  * Ahora cada persona solo ve lo que le corresponde según su rol y su área.
--  * Nadie puede cambiarse el rol a sí mismo.
--  * Los registros no se escriben directo en la tabla: se hace por funciones (archivo 0002)
--    que revisan las reglas del procedimiento.
--  * El consecutivo MTC-### lo asigna la base de datos, así no se repite.
--  * Los archivos adjuntos y las firmas ya no van dentro del registro: aquí solo queda
--    el nombre y la ruta; el archivo vive en la tabla "archivos" (ver 0004).

-- ---------------------------------------------------------------
-- Personas que usan la aplicación
-- ---------------------------------------------------------------
create table if not exists perfiles (
  id text primary key,             -- el identificador de la cuenta de ingreso (Neon Auth),
  nombre text not null,
  correo text not null unique,
  rol text not null check (rol in ('Administrador','Responsable del proceso','Aprobador autorizado')),
  area text not null default '',
  activo boolean not null default true,
  debe_cambiar_clave boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Áreas y tipos de desviación o derogación (los edita el Administrador)
-- ---------------------------------------------------------------
create table if not exists areas (
  nombre text primary key,
  orden int not null default 0
);

create table if not exists tipos (
  id text primary key,
  area text not null references areas(nombre) on update cascade,
  nombre text not null,
  data jsonb not null default '{}'::jsonb
);

-- Ajustes generales (por ejemplo, el enlace de acceso a la aplicación).
create table if not exists configuracion (
  clave text primary key,
  valor jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------
-- Registros (solicitudes)
-- ---------------------------------------------------------------
create sequence if not exists registros_consecutivo;

create table if not exists registros (
  id text primary key,                       -- MTC-001, MTC-002... (o BOR-xxxx mientras es borrador)
  tipo_gestion text not null check (tipo_gestion in ('Desviación','Derogación')),
  area text not null,
  etapa smallint not null default 0 check (etapa between 0 and 2),   -- 0 Solicitud, 1 Evaluación y Aprobación, 2 Cierre
  borrador boolean not null default false,
  devuelta boolean not null default false,
  cerrado boolean not null default false,
  resultado text not null default '',        -- '' o 'Rechazada'
  reportado_por_id text references perfiles(id),
  reportado_por text not null default '',
  criticidad text not null default '',
  vigencia_inicio date,
  vigencia_fin date,
  version int not null default 1,            -- sube con cada cambio; evita que dos personas se pisen
  data jsonb not null default '{}'::jsonb,   -- el contenido del formulario y del 8D
  fecha_cierre timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Mantiene dentro de "data" una copia de la etapa y el estado, tomada siempre de las columnas.
-- Así el navegador nunca puede dejar en "data" un valor distinto al real.
create or replace function registros_sincronizar() returns trigger
language plpgsql as $$
begin
  new.data := new.data || jsonb_build_object('id', new.id, 'stage', new.etapa, 'cerrado', new.cerrado,
    'resultado', new.resultado, 'borrador', new.borrador, 'devuelta', new.devuelta);
  return new;
end $$;
drop trigger if exists registros_sincronizar_trg on registros;
create trigger registros_sincronizar_trg before insert or update on registros
  for each row execute function registros_sincronizar();
create index if not exists registros_area_idx on registros(area);
create index if not exists registros_dueno_idx on registros(reportado_por_id);
create index if not exists registros_estado_idx on registros(etapa, cerrado);

-- Historial de lo que pasó en cada registro. Solo se agrega, nunca se borra ni se cambia.
create table if not exists bitacora (
  id bigint generated always as identity primary key,
  registro_id text not null references registros(id) on delete cascade on update cascade,
  etapa text not null default '',
  rol text not null default '',
  usuario text not null default '',
  fecha date not null default ((now() at time zone 'America/Bogota')::date),
  comentario text not null default '',
  creado_en timestamptz not null default now()
);
create index if not exists bitacora_registro_idx on bitacora(registro_id);

-- Firmas de cada etapa (la imagen de la firma vive en la tabla "archivos").
create table if not exists firmas (
  registro_id text not null references registros(id) on delete cascade on update cascade,
  espacio text not null check (espacio in ('sol','aprob','cierre','admin')),
  usuario_id text references perfiles(id),
  nombre text not null default '',
  rol text not null default '',
  ruta_imagen text not null default '',
  fecha timestamptz not null default now(),
  primary key (registro_id, espacio)
);

-- Archivos adjuntos (solo el nombre y la ruta; el archivo vive en la tabla "archivos").
create table if not exists adjuntos (
  id uuid primary key default gen_random_uuid(),
  registro_id text not null references registros(id) on delete cascade on update cascade,
  nombre text not null,
  tipo text not null default '',
  tamano bigint not null default 0,
  ruta text not null,
  subido_por text not null default '',
  creado_en timestamptz not null default now()
);
create index if not exists adjuntos_registro_idx on adjuntos(registro_id);
-- Un mismo archivo no puede estar anotado en dos registros (así nadie "toma prestado" el archivo de otro).
create unique index if not exists adjuntos_ruta_unica on adjuntos(ruta);

-- Huella de los registros eliminados: quién, cuándo, por qué y una copia completa.
create table if not exists auditoria_eliminados (
  id uuid primary key default gen_random_uuid(),
  registro_id text not null,
  eliminado_por_id text,
  eliminado_por text not null,
  correo text not null default '',
  rol text not null default '',
  motivo text not null,
  copia jsonb not null,
  restaurado boolean not null default false,
  restaurado_por text not null default '',
  restaurado_en timestamptz,
  creado_en timestamptz not null default now()
);

-- Siempre debe quedar al menos un Administrador activo (no se puede quitar, desactivar ni borrar al último).
create or replace function perfiles_proteger_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.rol = 'Administrador' and old.activo
     and (tg_op = 'DELETE' or new.rol <> 'Administrador' or not new.activo) then
    if not exists (select 1 from perfiles where rol = 'Administrador' and activo and id <> old.id) then
      raise exception 'Debe quedar al menos un Administrador activo.';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists perfiles_proteger_admin_trg on perfiles;
create trigger perfiles_proteger_admin_trg before update or delete on perfiles
  for each row execute function perfiles_proteger_admin();

-- Un área que todavía tiene registros o personas no se puede eliminar.
create or replace function areas_proteger_borrado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from registros where area = old.nombre) or exists (select 1 from perfiles where area = old.nombre) then
    raise exception 'No se puede eliminar un área con registros o usuarios asignados.';
  end if;
  return old;
end $$;
drop trigger if exists areas_proteger_borrado_trg on areas;
create trigger areas_proteger_borrado_trg before delete on areas
  for each row execute function areas_proteger_borrado();

-- ---------------------------------------------------------------
-- Funciones de apoyo: quién soy yo
-- ---------------------------------------------------------------
create or replace function mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.user_id() and activo
$$;

create or replace function mi_area() returns text
language sql stable security definer set search_path = public as $$
  select area from perfiles where id = auth.user_id() and activo
$$;

create or replace function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(mi_rol() = 'Administrador', false)
$$;

-- ¿Esta persona puede ver este registro?
--  * Administrador y Aprobador: todos (menos los borradores de otras personas).
--  * Responsable del proceso: los suyos y los de su área.
--  * Un borrador solo lo ve quien lo está escribiendo.
create or replace function puede_ver_registro(r registros) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when auth.user_id() is null or mi_rol() is null then false
    when r.borrador and not r.devuelta then r.reportado_por_id = auth.user_id()
    when r.reportado_por_id = auth.user_id() then true
    when mi_rol() in ('Administrador','Aprobador autorizado') then true
    when mi_rol() = 'Responsable del proceso' then coalesce(mi_area(), '') <> '' and r.area = mi_area()
    else false
  end
$$;

-- ---------------------------------------------------------------
-- Permisos (RLS): quién puede leer y escribir cada tabla
-- ---------------------------------------------------------------
alter table perfiles enable row level security;
alter table areas enable row level security;
alter table tipos enable row level security;
alter table configuracion enable row level security;
alter table registros enable row level security;
alter table bitacora enable row level security;
alter table firmas enable row level security;
alter table adjuntos enable row level security;
alter table auditoria_eliminados enable row level security;

-- Se quitan los permisos que la API da por defecto y se dan solo los necesarios.
revoke all on perfiles, areas, tipos, configuracion, registros, bitacora, firmas, adjuntos, auditoria_eliminados from anonymous, authenticated;
revoke all on sequence registros_consecutivo from anonymous, authenticated;

-- Lectura: solo quien tiene perfil activo en la aplicación ve las listas de apoyo. Esto importa porque en\n-- Neon cualquiera podría crear una cuenta de ingreso; sin perfil, esa cuenta no ve nada.
grant select on perfiles, areas, tipos, configuracion to authenticated;
drop policy if exists perfiles_leer on perfiles;
create policy perfiles_leer on perfiles for select to authenticated using (mi_rol() is not null or id = auth.user_id());
drop policy if exists areas_leer on areas;
create policy areas_leer on areas for select to authenticated using (mi_rol() is not null);
drop policy if exists tipos_leer on tipos;
create policy tipos_leer on tipos for select to authenticated using (mi_rol() is not null);
drop policy if exists config_leer on configuracion;
create policy config_leer on configuracion for select to authenticated using (mi_rol() is not null);

-- Escritura de áreas, tipos y ajustes: solo el Administrador.
grant insert, update, delete on areas, tipos, configuracion to authenticated;
drop policy if exists areas_admin on areas;
create policy areas_admin on areas for all to authenticated using (es_admin()) with check (es_admin());
drop policy if exists tipos_admin on tipos;
create policy tipos_admin on tipos for all to authenticated using (es_admin()) with check (es_admin());
drop policy if exists config_admin on configuracion;
create policy config_admin on configuracion for all to authenticated using (es_admin()) with check (es_admin());

-- Personas: solo el Administrador las cambia, y solo estos datos. El correo y el identificador
-- no se tocan desde la aplicación (la creación de cuentas la hace una función aparte del servidor).
grant update (nombre, rol, area, activo, debe_cambiar_clave) on perfiles to authenticated;
drop policy if exists perfiles_admin on perfiles;
create policy perfiles_admin on perfiles for update to authenticated using (es_admin()) with check (es_admin());

-- Registros, bitácora, firmas y adjuntos: solo se leen. Se escriben por las funciones del archivo 0002.
grant select on registros, bitacora, firmas, adjuntos to authenticated;
drop policy if exists registros_leer on registros;
create policy registros_leer on registros for select to authenticated using (puede_ver_registro(registros));
drop policy if exists bitacora_leer on bitacora;
create policy bitacora_leer on bitacora for select to authenticated
  using (exists (select 1 from registros r where r.id = bitacora.registro_id and puede_ver_registro(r)));
drop policy if exists firmas_leer on firmas;
create policy firmas_leer on firmas for select to authenticated
  using (exists (select 1 from registros r where r.id = firmas.registro_id and puede_ver_registro(r)));
drop policy if exists adjuntos_leer on adjuntos;
create policy adjuntos_leer on adjuntos for select to authenticated
  using (exists (select 1 from registros r where r.id = adjuntos.registro_id and puede_ver_registro(r)));

-- Huella de eliminados: solo la lee el Administrador. Nadie la borra desde la aplicación.
grant select on auditoria_eliminados to authenticated;
drop policy if exists auditoria_leer on auditoria_eliminados;
create policy auditoria_leer on auditoria_eliminados for select to authenticated using (es_admin());
