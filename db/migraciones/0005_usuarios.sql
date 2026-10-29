-- BASE DE DATOS v2 · Gestión de Desviaciones y Derogaciones MATEC
-- Paso 5: dar de alta a las personas que pueden usar la aplicación.
--
-- Ejecutar DESPUÉS de 0004_archivos.sql.
--
-- Crear la cuenta de ingreso (correo y contraseña) lo hace el servicio de ingreso de Neon. Aquí solo se anota
-- quién es esa persona dentro de la aplicación (nombre, rol y área). Sin esta anotación, una cuenta de ingreso
-- no puede ver ni hacer nada: así, aunque alguien cree una cuenta por su cuenta, queda sin acceso.
-- Solo el Administrador puede anotar personas. La primera (la Administradora) se crea con
-- scripts/crear-primer-admin.mjs, que no pasa por aquí.

create or replace function crear_perfil(p_id text, p_nombre text, p_correo text, p_rol text, p_area text default '')
returns perfiles
language plpgsql security definer set search_path = public as $$
declare
  v_perfil perfiles;
begin
  if not es_admin() then raise exception 'Solo el Administrador puede dar de alta personas.'; end if;
  if not texto_lleno(p_id) then raise exception 'Falta el identificador de la cuenta.'; end if;
  if not texto_lleno(p_nombre) then raise exception 'Escriba el nombre de la persona.'; end if;
  if trim(coalesce(p_correo, '')) !~'^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'El correo no es válido.'; end if;
  if p_rol not in ('Administrador', 'Responsable del proceso', 'Aprobador autorizado') then raise exception 'El rol no es válido.'; end if;
  if p_rol = 'Responsable del proceso' and not texto_lleno(p_area) then
    raise exception 'El Responsable del proceso debe tener un área.';
  end if;
  if texto_lleno(p_area) and not exists (select 1 from areas where nombre = p_area) then
    raise exception 'El área no existe.';
  end if;

  insert into perfiles (id, nombre, correo, rol, area, debe_cambiar_clave)
  values (p_id, trim(p_nombre), lower(trim(p_correo)), p_rol, coalesce(p_area, ''), true)
  returning * into v_perfil;
  return v_perfil;
end $$;

revoke all on function crear_perfil(text, text, text, text, text) from public, anon;
grant execute on function crear_perfil(text, text, text, text, text) to authenticated;
