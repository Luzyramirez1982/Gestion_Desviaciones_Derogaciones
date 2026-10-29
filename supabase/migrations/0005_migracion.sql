-- BASE DE DATOS v2 · Gestión de Desviaciones y Derogaciones MATEC
-- Paso 5: apoyo para migrar los datos de la versión anterior.
--
-- Ejecutar DESPUÉS de 0004_almacenamiento.sql.
--
-- El script de migración (scripts/migrar-v1-a-v2.mjs) usa esta función para que el siguiente
-- consecutivo continúe después del último número que ya existía (MTC-009 → el próximo es MTC-010).
-- Solo la puede llamar la clave del servidor: ninguna persona con sesión en la aplicación.

create or replace function establecer_consecutivo(p_ultimo int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_ultimo is null or p_ultimo < 0 then raise exception 'El consecutivo debe ser un número positivo.'; end if;
  -- Nunca se retrocede: así no se pueden repetir números que ya se usaron.
  if p_ultimo > coalesce((select last_value from registros_consecutivo where is_called), 0) then
    perform setval('registros_consecutivo', greatest(p_ultimo, 1), p_ultimo > 0);
  end if;
end $$;

revoke all on function establecer_consecutivo(int) from public, anon, authenticated;
