-- BASE DE DATOS v2 · Gestión de Desviaciones y Derogaciones MATEC
-- Paso 8: identificar a la persona sin depender solo de auth.user_id().
--
-- Ejecutar DESPUÉS de 0007_lectura_completa.sql.
--
-- Por qué: en Neon (plan gratis), cuando el procesador despierta de dormir, la función auth.user_id()
-- (de la extensión de Neon que guarda la sesión) a veces todavía no tiene el identificador listo en la
-- primera consulta, aunque la persona sí envió una sesión válida: la lista llega vacía o la base niega
-- un permiso que sí se tiene (visto en la prueba contra Neon real, docs/NEON_PASOS.md). Es un problema
-- reportado de Neon (no de esta aplicación): la extensión no siempre reconoce el token en esa primera
-- consulta, aunque el token sí llegó con la petición.
--
-- mi_id() pregunta "quién soy yo" de dos formas y usa la primera que responda: auth.user_id() y,
-- si no responde, el identificador leído directo del token que llegó con la petición. Las funciones
-- que decidían permisos a partir de auth.user_id() (mi_rol, mi_area, puede_ver_registro y la política
-- de lectura de perfiles) ahora usan mi_id().
--
-- Esto es un refuerzo, no reemplaza los reintentos que ya hace la aplicación (src/datos/neon.js):
-- si Neon no envía el token con la petición (otro problema ya reportado, más de fondo), ninguna de las
-- dos formas lo puede recuperar y el reintento sigue siendo necesario.

create or replace function mi_id() returns text
language plpgsql stable as $$
declare
  v_claims text;
begin
  begin
    v_claims := current_setting('request.jwt.claims', true);
  exception when others then
    v_claims := null;
  end;
  return coalesce(auth.user_id(), nullif(v_claims::json ->> 'sub', ''));
exception when others then
  return auth.user_id();
end $$;

create or replace function mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = mi_id() and activo
$$;

create or replace function mi_area() returns text
language sql stable security definer set search_path = public as $$
  select area from perfiles where id = mi_id() and activo
$$;

create or replace function puede_ver_registro(r registros) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when mi_id() is null or mi_rol() is null then false
    when r.borrador and not r.devuelta then r.reportado_por_id = mi_id()
    when r.reportado_por_id = mi_id() then true
    when mi_rol() in ('Administrador','Aprobador autorizado') then true
    when mi_rol() = 'Responsable del proceso' then coalesce(mi_area(), '') <> '' and r.area = mi_area()
    else false
  end
$$;

drop policy if exists perfiles_leer on perfiles;
create policy perfiles_leer on perfiles for select to authenticated using (mi_rol() is not null or id = mi_id());
