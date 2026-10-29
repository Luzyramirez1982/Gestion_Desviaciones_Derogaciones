-- BASE DE DATOS v2 · Gestión de Desviaciones y Derogaciones MATEC
-- Paso 4: dónde se guardan los archivos adjuntos y las imágenes de las firmas.
--
-- Ejecutar DESPUÉS de 0003_flujo.sql.
--
-- Los archivos van en una tabla aparte ("archivos"), nunca dentro del registro, para que listar
-- registros siga siendo rápido. Nadie los abre con un enlace público: solo se leen con sesión y
-- siguiendo la misma regla de visibilidad que el registro al que pertenecen. Dos carpetas:
--   registros/<consecutivo>/<archivo>            los adjuntos de cada registro
--   firmas/<identificador de la persona>/<archivo>   las imágenes de las firmas
--
-- Quién puede qué:
--  * Subir un adjunto: quien puede ver ese registro, mientras siga abierto.
--  * Subir una firma: cada persona, solo en su propia carpeta.
--  * Leer un archivo: quien puede ver el registro al que pertenece.
--  * Nadie puede reemplazar ni borrar archivos desde la aplicación.
--
-- Tamaño: 5 MB por archivo. Tipos permitidos: imágenes, PDF, texto, Word, Excel y PowerPoint
-- (no se admiten programas ni archivos comprimidos).
--
-- Nota: se guardan en la misma base (Neon gratis da 1 GB en total). Si más adelante el espacio no
-- alcanza, esta tabla se puede cambiar por el almacenamiento de objetos de Neon sin tocar las pantallas:
-- solo cambian subir_archivo() y el adaptador de src/datos/.

create table if not exists archivos (
  ruta text primary key,
  tipo text not null,
  tamano bigint not null check (tamano > 0 and tamano <= 5 * 1048576),
  contenido text not null,                   -- el archivo en base64
  subido_por text not null default '',
  creado_en timestamptz not null default now()
);

alter table archivos enable row level security;
revoke all on archivos from anonymous, authenticated;
grant select on archivos to authenticated;

drop policy if exists archivos_leer on archivos;
create policy archivos_leer on archivos for select to authenticated
using (
  exists (select 1 from adjuntos a join registros r on r.id = a.registro_id
          where a.ruta = archivos.ruta and puede_ver_registro(r))
  or exists (select 1 from firmas f join registros r on r.id = f.registro_id
             where f.ruta_imagen = archivos.ruta and puede_ver_registro(r))
);

-- Guarda un archivo (en base64) si la persona tiene derecho a subirlo a esa ruta.
create or replace function subir_archivo(p_ruta text, p_tipo text, p_base64 text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_partes text[];
  v_bytes bigint;
  v_perfil perfiles;
begin
  select * into v_perfil from perfiles where id = auth.user_id() and activo;
  if not found then raise exception 'No tiene permiso para subir archivos.'; end if;

  if p_ruta is null or p_ruta !~ '^(registros|firmas)/[A-Za-z0-9_-]+/[A-Za-z0-9._() -]+$' or p_ruta like '%..%' then
    raise exception 'La ruta del archivo no es válida.';
  end if;
  if p_tipo is null or p_tipo not in (
    'image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) then
    raise exception 'Ese tipo de archivo no está permitido.';
  end if;

  v_partes := string_to_array(p_ruta, '/');
  if v_partes[1] = 'firmas' then
    if v_partes[2] <> auth.user_id() then raise exception 'La firma solo se puede guardar en su propia carpeta.'; end if;
    if p_tipo <> 'image/png' then raise exception 'La firma debe ser una imagen PNG.'; end if;
  else
    if not exists (select 1 from registros r
                   where r.id = v_partes[2] and puede_ver_registro(r)
                     and not r.cerrado and r.resultado <> 'Rechazada') then
      raise exception 'No puede adjuntar archivos a este registro.';
    end if;
  end if;

  v_bytes := octet_length(decode(coalesce(p_base64, ''), 'base64'));
  if v_bytes = 0 or v_bytes > 5 * 1048576 then
    raise exception 'Cada archivo puede pesar hasta 5 MB.';
  end if;

  insert into archivos (ruta, tipo, tamano, contenido, subido_por)
  values (p_ruta, p_tipo, v_bytes, p_base64, v_perfil.nombre);
end $$;

revoke all on function subir_archivo(text, text, text) from public, anonymous;
grant execute on function subir_archivo(text, text, text) to authenticated;
