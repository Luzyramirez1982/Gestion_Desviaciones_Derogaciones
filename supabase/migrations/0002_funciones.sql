-- BASE DE DATOS v2 · Gestión de Desviaciones y Derogaciones MATEC
-- Paso 2 de 2: funciones que escriben los datos y revisan las reglas.
--
-- Ejecutar DESPUÉS de 0001_tablas_y_permisos.sql.
--
-- La aplicación ya no escribe directo en las tablas. Llama a estas funciones y ellas
-- comprueban quién es la persona y si puede hacer lo que pide.
--
-- Pendiente para el siguiente paso (0003): firmar y avanzar de etapa, devolver para
-- ajustes, rechazar, restaurar un registro eliminado y guardar adjuntos y firmas.

-- Siguiente número de consecutivo: MTC-001, MTC-002...
create or replace function siguiente_consecutivo() returns text
language sql security definer set search_path = public as $$
  select 'MTC-' || lpad(nextval('registros_consecutivo')::text, 3, '0')
$$;

-- Crea una solicitud nueva. Si es borrador queda con un código temporal BOR-xxxx;
-- si se envía, recibe su consecutivo y pasa a Evaluación y Aprobación.
create or replace function crear_registro(p_data jsonb, p_borrador boolean default false)
returns registros
language plpgsql security definer set search_path = public as $$
declare
  v_perfil perfiles;
  v_reg registros;
  v_id text;
begin
  select * into v_perfil from perfiles where id = auth.uid() and activo;
  if v_perfil.id is null then raise exception 'No tiene acceso a la aplicación.'; end if;
  if v_perfil.rol not in ('Responsable del proceso','Administrador') then
    raise exception 'Su rol no puede crear solicitudes.';
  end if;
  if coalesce(p_data->>'tipoGestion','') not in ('Desviación','Derogación') then
    raise exception 'Indique si es una Desviación o una Derogación.';
  end if;
  if coalesce(p_data->>'area','') = '' then raise exception 'Indique el área a la que va dirigida la solicitud.'; end if;

  v_id := case when p_borrador then 'BOR-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
               else siguiente_consecutivo() end;

  insert into registros (id, tipo_gestion, area, etapa, borrador, reportado_por_id, reportado_por,
                         criticidad, vigencia_inicio, vigencia_fin, data)
  values (v_id, p_data->>'tipoGestion', p_data->>'area',
          case when p_borrador then 0 else 1 end, p_borrador,
          v_perfil.id, v_perfil.nombre,
          coalesce(p_data->>'criticidad',''),
          nullif(p_data->>'vigenciaInicio','')::date, nullif(p_data->>'vigenciaFin','')::date,
          p_data || jsonb_build_object('id', v_id, 'stage', case when p_borrador then 0 else 1 end))
  returning * into v_reg;

  insert into bitacora (registro_id, etapa, rol, usuario, comentario)
  values (v_id, 'Solicitud', v_perfil.rol, v_perfil.nombre,
          case when p_borrador then 'Borrador creado.' else 'Solicitud creada y firmada.' end);

  return v_reg;
end $$;

-- Guarda cambios del contenido de un registro.
-- Hay que enviar la "version" que se tenía abierta. Si alguien más lo cambió mientras tanto,
-- la función avisa (conflicto_version) en vez de borrar lo que esa otra persona escribió.
-- No permite cambiar la etapa, el cierre ni el resultado: eso lo hacen las funciones de firma.
create or replace function guardar_registro(p_id text, p_version int, p_data jsonb)
returns registros
language plpgsql security definer set search_path = public as $$
declare
  v_reg registros;
  v_nuevo registros;
begin
  select * into v_reg from registros where id = p_id for update;
  if v_reg.id is null or not puede_ver_registro(v_reg) then raise exception 'No se encontró el registro.'; end if;
  if v_reg.cerrado or v_reg.resultado = 'Rechazada' then raise exception 'El registro ya está cerrado y no se puede editar.'; end if;
  if mi_rol() = 'Responsable del proceso' and v_reg.reportado_por_id is distinct from auth.uid()
     and coalesce(mi_area(),'') <> v_reg.area then
    raise exception 'No puede editar este registro.';
  end if;
  if v_reg.version <> p_version then
    raise exception 'conflicto_version' using errcode = 'P0001',
      hint = 'Otra persona cambió este registro mientras usted lo editaba. Vuelva a abrirlo.';
  end if;

  update registros set
    tipo_gestion = coalesce(nullif(p_data->>'tipoGestion',''), tipo_gestion),
    area = coalesce(nullif(p_data->>'area',''), area),
    criticidad = coalesce(p_data->>'criticidad', criticidad),
    vigencia_inicio = nullif(p_data->>'vigenciaInicio','')::date,
    vigencia_fin = nullif(p_data->>'vigenciaFin','')::date,
    -- lo que controla el servidor se vuelve a poner encima, por si el navegador intentó cambiarlo
    data = p_data || jsonb_build_object('id', v_reg.id, 'stage', v_reg.etapa, 'cerrado', v_reg.cerrado,
                                        'resultado', v_reg.resultado, 'borrador', v_reg.borrador, 'devuelta', v_reg.devuelta),
    version = version + 1,
    actualizado_en = now()
  where id = p_id
  returning * into v_nuevo;

  return v_nuevo;
end $$;

-- Elimina un registro (solo el Administrador). Guarda antes la huella: quién, cuándo, por qué
-- y una copia completa para poder restaurarlo.
create or replace function eliminar_registro(p_id text, p_motivo text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reg registros;
  v_perfil perfiles;
begin
  if not es_admin() then raise exception 'Solo el Administrador puede eliminar registros.'; end if;
  if length(trim(coalesce(p_motivo,''))) < 5 then raise exception 'Escriba el motivo de la eliminación.'; end if;
  select * into v_reg from registros where id = p_id for update;
  if v_reg.id is null then raise exception 'No se encontró el registro.'; end if;
  select * into v_perfil from perfiles where id = auth.uid();

  insert into auditoria_eliminados (registro_id, eliminado_por_id, eliminado_por, correo, rol, motivo, copia)
  values (v_reg.id, v_perfil.id, v_perfil.nombre, v_perfil.correo, v_perfil.rol, trim(p_motivo),
    jsonb_build_object(
      'registro', to_jsonb(v_reg),
      'bitacora', coalesce((select jsonb_agg(to_jsonb(b) order by b.id) from bitacora b where b.registro_id = v_reg.id), '[]'::jsonb),
      'firmas',   coalesce((select jsonb_agg(to_jsonb(f)) from firmas f where f.registro_id = v_reg.id), '[]'::jsonb),
      'adjuntos', coalesce((select jsonb_agg(to_jsonb(a)) from adjuntos a where a.registro_id = v_reg.id), '[]'::jsonb)
    ));

  delete from registros where id = p_id;   -- la bitácora, firmas y adjuntos se borran con él
end $$;

-- La persona que cambió su contraseña temporal lo avisa aquí.
create or replace function marcar_clave_cambiada() returns void
language sql security definer set search_path = public as $$
  update perfiles set debe_cambiar_clave = false where id = auth.uid()
$$;

-- Cuánto espacio se está usando (solo Administrador), para avisar antes de que se llene.
-- Plan gratuito de Supabase: 500 MB de base de datos y 1 GB de archivos.
create or replace function uso_almacenamiento()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_bd bigint;
  v_archivos bigint;
begin
  if not es_admin() then raise exception 'Solo el Administrador puede ver el uso del espacio.'; end if;
  select pg_database_size(current_database()) into v_bd;
  select coalesce(sum(tamano), 0) into v_archivos from adjuntos;
  return jsonb_build_object(
    'base_datos_bytes', v_bd, 'base_datos_limite_bytes', 500 * 1024 * 1024,
    'archivos_bytes', v_archivos, 'archivos_limite_bytes', 1024 * 1024 * 1024,
    'registros', (select count(*) from registros)
  );
end $$;

-- Quién puede llamar cada función: solo personas con sesión.
revoke all on function siguiente_consecutivo(), crear_registro(jsonb, boolean), guardar_registro(text, int, jsonb),
  eliminar_registro(text, text), marcar_clave_cambiada(), uso_almacenamiento() from public, anon;
grant execute on function crear_registro(jsonb, boolean), guardar_registro(text, int, jsonb),
  eliminar_registro(text, text), marcar_clave_cambiada(), uso_almacenamiento() to authenticated;
