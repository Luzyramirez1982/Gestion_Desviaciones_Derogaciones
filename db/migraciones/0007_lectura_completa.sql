-- BASE DE DATOS v2 · Gestión de Desviaciones y Derogaciones MATEC
-- Paso 7: leer una solicitud (o la lista) completa en UNA sola consulta.
--
-- Ejecutar DESPUÉS de 0006_archivos_en_bucket.sql.
--
-- Por qué: en la prueba contra Neon real, las primeras consultas de una sesión a veces llegaban a medias (la
-- solicitud sí, pero sin sus firmas ni su bitácora). Si cada parte se pide por separado, la aplicación puede
-- mostrar una solicitud incompleta. Pidiéndolo todo en una sola consulta, llega completo o no llega, y si no
-- llega la aplicación vuelve a pedirlo.
--
-- Las dos funciones corren con los permisos de quien pregunta, así que las reglas de quién ve qué (RLS) siguen
-- siendo las mismas: quien no ve la solicitud recibe «nada».

-- Una solicitud con sus firmas, adjuntos y bitácora. Devuelve null si no existe o la persona no la ve.
create or replace function registro_completo(p_id text) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'registro', to_jsonb(r),
    'firmas',   coalesce((select jsonb_agg(to_jsonb(f)) from firmas f where f.registro_id = r.id), '[]'::jsonb),
    'adjuntos', coalesce((select jsonb_agg(to_jsonb(a) order by a.creado_en) from adjuntos a where a.registro_id = r.id), '[]'::jsonb),
    'bitacora', coalesce((select jsonb_agg(to_jsonb(b) order by b.id) from bitacora b where b.registro_id = r.id), '[]'::jsonb)
  )
  from registros r
  where r.id = p_id
$$;

-- Una página de la lista de solicitudes, cada una con sus firmas, de la más reciente a la más antigua.
create or replace function listar_registros(p_desde int, p_cantidad int) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'registro', to_jsonb(r),
      'firmas', coalesce((select jsonb_agg(to_jsonb(f)) from firmas f where f.registro_id = r.id), '[]'::jsonb)
    ) order by r.actualizado_en desc, r.id
  ), '[]'::jsonb)
  from (
    select * from registros order by actualizado_en desc, id
    limit least(greatest(coalesce(p_cantidad, 0), 0), 1000) offset greatest(coalesce(p_desde, 0), 0)
  ) r
$$;

revoke all on function registro_completo(text), listar_registros(int, int) from public, anonymous;
grant execute on function registro_completo(text), listar_registros(int, int) to authenticated;
