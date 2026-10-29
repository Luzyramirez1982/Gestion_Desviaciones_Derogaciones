-- BASE DE DATOS v2 · Gestión de Desviaciones y Derogaciones MATEC
-- Paso 6: los archivos pasan al bucket de Neon (Object Storage).
--
-- Ejecutar DESPUÉS de 0005_usuarios.sql.
--
-- Antes los archivos se guardaban dentro de la base (tabla "archivos", en base64). Ahora el contenido vive en el
-- bucket "uploads" y la tabla solo anota qué archivo existe (ruta, tipo, tamaño y quién lo subió). Las reglas de
-- quién puede subir y quién puede leer son las mismas de siempre y siguen viviendo aquí, en la base.
--
-- Cómo se usa: la función de servidor "archivos" (functions/archivos) guarda las claves del bucket. Recibe la sesión
-- de la persona, le pregunta a la base con estas funciones si tiene permiso, y solo entonces sube o entrega el archivo.
--   1. puede_subir_archivo(...)  ¿puede subir este archivo a esta ruta?   (si no, dice por qué)
--   2. (la función sube el archivo al bucket)
--   3. registrar_archivo(...)    deja anotado el archivo (vuelve a revisar el permiso)
--   4. puede_leer_archivo(ruta)  ¿puede leerlo? (solo si ve el registro al que pertenece)

alter table archivos drop column if exists contenido;
drop function if exists subir_archivo(text, text, text);

-- Revisa si la persona puede subir el archivo. Devuelve true o explica por qué no.
create or replace function puede_subir_archivo(p_ruta text, p_tipo text, p_tamano bigint) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_partes text[];
begin
  if not exists (select 1 from perfiles where id = auth.user_id() and activo) then
    raise exception 'No tiene permiso para subir archivos.';
  end if;

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
  if p_tamano is null or p_tamano <= 0 or p_tamano > 5 * 1048576 then
    raise exception 'Cada archivo puede pesar hasta 5 MB.';
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

  -- Una ruta ya usada no se reemplaza: así nadie puede cambiar un archivo ya guardado.
  if exists (select 1 from archivos where ruta = p_ruta) then
    raise exception 'Ese archivo ya existe.';
  end if;
  return true;
end $$;

-- Anota el archivo una vez subido al bucket. Vuelve a revisar el permiso por si algo cambió mientras se subía.
create or replace function registrar_archivo(p_ruta text, p_tipo text, p_tamano bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_nombre text;
begin
  perform puede_subir_archivo(p_ruta, p_tipo, p_tamano);
  select nombre into v_nombre from perfiles where id = auth.user_id() and activo;
  insert into archivos (ruta, tipo, tamano, subido_por) values (p_ruta, p_tipo, p_tamano, v_nombre);
end $$;

-- ¿Puede leer este archivo? Corre con los permisos de quien pregunta, así que solo ve los archivos
-- de registros que puede ver (la regla vive en la política archivos_leer de 0004).
create or replace function puede_leer_archivo(p_ruta text) returns boolean
language sql stable as $$
  select exists (select 1 from archivos where ruta = p_ruta)
$$;

revoke all on function puede_subir_archivo(text, text, bigint), registrar_archivo(text, text, bigint), puede_leer_archivo(text)
  from public, anonymous;
grant execute on function puede_subir_archivo(text, text, bigint), registrar_archivo(text, text, bigint), puede_leer_archivo(text)
  to authenticated;

-- El espacio de los archivos ahora es el del bucket (5 GB gratis); la base conserva su 1 GB.
create or replace function uso_almacenamiento()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_bd bigint;
  v_archivos bigint;
begin
  if not es_admin() then raise exception 'Solo el Administrador puede ver el uso del espacio.'; end if;
  select pg_database_size(current_database()) into v_bd;
  select coalesce(sum(tamano), 0) into v_archivos from archivos;
  return jsonb_build_object(
    'base_datos_bytes', v_bd, 'base_datos_limite_bytes', 1024 * 1024 * 1024,
    'archivos_bytes', v_archivos, 'archivos_limite_bytes', 5::bigint * 1024 * 1024 * 1024,
    'registros', (select count(*) from registros)
  );
end $$;
