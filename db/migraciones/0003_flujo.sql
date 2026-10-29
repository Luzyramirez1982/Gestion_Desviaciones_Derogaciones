-- BASE DE DATOS v2 · Gestión de Desviaciones y Derogaciones MATEC
-- Paso 3 de 3: el flujo del procedimiento (firmar, avanzar, devolver, rechazar...).
--
-- Ejecutar DESPUÉS de 0002_funciones.sql.
--
-- Aquí viven las reglas que antes solo revisaba la pantalla. Ahora la base de datos las
-- exige, así que nadie puede saltarse una etapa ni firmar por otra persona, aunque
-- intente hacerlo por fuera de la aplicación.

-- Texto de la vigencia (igual que vigenciaTexto en src/dominio/registro.js).
create or replace function vigencia_texto(p_tipo text, d jsonb) returns text
language plpgsql immutable as $$
declare
  ini text := nullif(d ->> 'vigenciaInicio', '');
  fin text := nullif(d ->> 'vigenciaFin', '');
  ef  text := nullif(d ->> 'fechaEfectiva', '');
  rango text;
begin
  if p_tipo = 'Derogación' and d ->> 'alcanceDerogacion' = 'Definitiva' then
    return 'Definitiva — efectiva de forma permanente desde ' || coalesce(ef, ini, '—');
  end if;
  rango := coalesce(ini, '—') || ' a ' || coalesce(fin, '—');
  return case when p_tipo = 'Derogación' then 'Temporal — del ' || rango else rango end;
end $$;

-- ---------------------------------------------------------------
-- Enviar la solicitud (desde un borrador, o de nuevo tras una devolución)
-- ---------------------------------------------------------------
-- Si era un borrador (BOR-xxxx) recibe su consecutivo MTC-###. Queda firmada por quien la
-- escribió y pasa a Evaluación y Aprobación.
create or replace function enviar_registro(p_id text, p_version int, p_data jsonb, p_firma_ruta text)
returns registros
language plpgsql security definer set search_path = public as $$
declare
  v_reg registros;
  v_perfil perfiles;
  v_nuevo registros;
  v_id text;
  v_error text;
begin
  v_reg := cargar_registro(p_id);
  select * into v_perfil from perfiles where id = auth.user_id() and activo;
  if not v_reg.borrador then raise exception 'Esta solicitud ya fue enviada.'; end if;
  if v_reg.reportado_por_id is distinct from auth.user_id() then
    raise exception 'Solo quien escribió la solicitud puede enviarla.';
  end if;
  if v_reg.version <> p_version then
    raise exception 'conflicto_version' using errcode = 'P0001',
      hint = 'Otra persona cambió este registro mientras usted lo editaba. Vuelva a abrirlo.';
  end if;
  perform validar_tamano(p_data);
  if coalesce(p_data ->> 'tipoGestion', '') not in ('Desviación','Derogación') then
    raise exception 'Indique si es una Desviación o una Derogación.';
  end if;
  if not texto_lleno(p_data ->> 'area') then raise exception 'Indique el área a la que va dirigida la solicitud.'; end if;
  if not ruta_firma_valida(p_firma_ruta) then raise exception 'Dibuje su firma en el recuadro antes de enviar la solicitud.'; end if;
  v_error := validar_vigencia(p_data);
  if v_error <> '' then raise exception '%', v_error; end if;

  v_id := case when v_reg.id like 'BOR-%' then siguiente_consecutivo() else v_reg.id end;

  update registros set
    id = v_id,
    tipo_gestion = p_data ->> 'tipoGestion',
    area = p_data ->> 'area',
    etapa = 1, borrador = false, devuelta = false,
    criticidad = coalesce(p_data ->> 'criticidad', ''),
    vigencia_inicio = nullif(p_data ->> 'vigenciaInicio', '')::date,
    vigencia_fin = nullif(p_data ->> 'vigenciaFin', '')::date,
    -- los campos de evaluación y de cierre no los llena quien envía (las medidas de control sí: las escribe en la solicitud)
    data = conservar_campos(v_reg.data,
             conservar_campos(v_reg.data, p_data, array['conceptoEvaluacion','observacionesAprobacion']::text[]),
             array['observacionesCierre','cumplimientoControl']),
    version = version + 1,
    actualizado_en = now()
  where id = p_id
  returning * into v_nuevo;

  delete from bitacora where registro_id = v_id and comentario = 'Borrador creado.';
  insert into firmas (registro_id, espacio, usuario_id, nombre, rol, ruta_imagen)
  values (v_id, 'sol', v_perfil.id, v_perfil.nombre, v_perfil.rol, p_firma_ruta)
  on conflict (registro_id, espacio) do update
    set usuario_id = excluded.usuario_id, nombre = excluded.nombre, rol = excluded.rol,
        ruta_imagen = excluded.ruta_imagen, fecha = now();
  insert into bitacora (registro_id, etapa, rol, usuario, comentario)
  values (v_id, 'Solicitud', v_perfil.rol, v_perfil.nombre,
          case when v_reg.devuelta then 'Solicitud ajustada y reenviada con firma.' else 'Solicitud creada y firmada.' end);

  return v_nuevo;
end $$;

-- ---------------------------------------------------------------
-- Firmar una etapa
-- ---------------------------------------------------------------
-- p_espacio: 'aprob' (Aprobador, en Evaluación y Aprobación), 'cierre' (quien hizo la solicitud,
-- en Cierre) o 'admin' (visto bueno opcional del Administrador).
-- Firmar la evaluación pasa la solicitud a Cierre; firmar el cierre la deja cerrada.
create or replace function firmar_etapa(p_id text, p_espacio text, p_ruta_firma text, p_comentario text default '')
returns registros
language plpgsql security definer set search_path = public as $$
declare
  v_reg registros;
  v_perfil perfiles;
  v_nuevo registros;
  v_falta text[];
  v_com text := case when texto_lleno(p_comentario) then ' ' || btrim(p_comentario) else '' end;
begin
  v_reg := cargar_registro(p_id);
  select * into v_perfil from perfiles where id = auth.user_id() and activo;
  if p_espacio not in ('aprob', 'cierre', 'admin') then raise exception 'Ese espacio de firma no se firma aquí.'; end if;
  if not ruta_firma_valida(p_ruta_firma) then raise exception 'Dibuje su firma en el recuadro antes de firmar.'; end if;

  if p_espacio = 'admin' then
    if v_perfil.rol <> 'Administrador' then raise exception 'Solo el Administrador da el visto bueno.'; end if;
  else
    if v_reg.borrador or v_reg.cerrado or v_reg.resultado = 'Rechazada' then
      raise exception 'La solicitud ya no admite firmas.';
    end if;
    if p_espacio = 'aprob' and not (v_perfil.rol = 'Aprobador autorizado' and v_reg.etapa = 1) then
      raise exception 'Solo el Aprobador autorizado firma la evaluación, y solo en la etapa de Evaluación y Aprobación.';
    end if;
    if p_espacio = 'cierre' and not (v_perfil.rol = 'Responsable del proceso' and v_reg.etapa = 2
                                     and v_reg.reportado_por_id = auth.user_id()) then
      raise exception 'El cierre lo firma quien hizo la solicitud, en la etapa de Cierre.';
    end if;
  end if;

  v_falta := requisitos_firma(v_reg, p_espacio);
  if array_length(v_falta, 1) > 0 then
    raise exception 'Antes de firmar complete: %', array_to_string(v_falta, '; ');
  end if;

  insert into firmas (registro_id, espacio, usuario_id, nombre, rol, ruta_imagen)
  values (p_id, p_espacio, v_perfil.id, v_perfil.nombre, v_perfil.rol, p_ruta_firma)
  on conflict (registro_id, espacio) do update
    set usuario_id = excluded.usuario_id, nombre = excluded.nombre, rol = excluded.rol,
        ruta_imagen = excluded.ruta_imagen, fecha = now();

  if p_espacio = 'admin' then
    perform anotar(p_id, 'Visto bueno del Administrador (firma).' || v_com);
    update registros set version = version + 1, actualizado_en = now() where id = p_id returning * into v_nuevo;
  elsif p_espacio = 'cierre' then
    perform anotar(p_id, 'Cerró la solicitud con observaciones de cierre y firma.' || v_com);
    update registros set cerrado = true, fecha_cierre = now(), version = version + 1, actualizado_en = now()
      where id = p_id returning * into v_nuevo;
  else
    perform anotar(p_id, 'Evaluó la solicitud, la aprobó y firmó.' || v_com);
    update registros set etapa = 2, version = version + 1, actualizado_en = now()
      where id = p_id returning * into v_nuevo;
  end if;
  return v_nuevo;
end $$;

-- El Administrador puede borrar su propio visto bueno.
create or replace function quitar_firma_admin(p_id text) returns registros
language plpgsql security definer set search_path = public as $$
declare v_reg registros; v_nuevo registros;
begin
  v_reg := cargar_registro(p_id);
  if not es_admin() then raise exception 'Solo el Administrador puede borrar su visto bueno.'; end if;
  delete from firmas where registro_id = p_id and espacio = 'admin';
  perform anotar(p_id, 'Borró su firma (Visto bueno del Administrador (opcional)).');
  update registros set version = version + 1, actualizado_en = now() where id = p_id returning * into v_nuevo;
  return v_nuevo;
end $$;

-- ---------------------------------------------------------------
-- Devolver, rechazar y retroceder
-- ---------------------------------------------------------------
-- Devuelve la solicitud al Responsable del proceso para que la ajuste y la reenvíe con nueva firma.
create or replace function devolver_registro(p_id text, p_motivo text) returns registros
language plpgsql security definer set search_path = public as $$
declare v_reg registros; v_nuevo registros;
begin
  v_reg := cargar_registro(p_id);
  if mi_rol() not in ('Aprobador autorizado', 'Administrador') then
    raise exception 'Solo el Aprobador autorizado (o el Administrador) puede devolver la solicitud.';
  end if;
  if v_reg.etapa <> 1 or v_reg.borrador or v_reg.cerrado or v_reg.resultado = 'Rechazada' then
    raise exception 'La solicitud no está en la etapa de Evaluación y Aprobación.';
  end if;
  if not texto_lleno(p_motivo) then raise exception 'Escriba el motivo en el campo de comentario.'; end if;

  perform anotar(p_id, 'Devuelta al Responsable del proceso para ajustes: ' || btrim(p_motivo));
  delete from firmas where registro_id = p_id and espacio in ('sol', 'aprob');
  update registros set etapa = 0, borrador = true, devuelta = true,
    data = data || jsonb_build_object('motivoDevolucion', btrim(p_motivo)),
    version = version + 1, actualizado_en = now()
  where id = p_id returning * into v_nuevo;
  return v_nuevo;
end $$;

-- Rechaza la solicitud: queda cerrada como "Rechazada".
create or replace function rechazar_registro(p_id text, p_motivo text) returns registros
language plpgsql security definer set search_path = public as $$
declare v_reg registros; v_nuevo registros;
begin
  v_reg := cargar_registro(p_id);
  if mi_rol() not in ('Aprobador autorizado', 'Administrador') then
    raise exception 'Solo el Aprobador autorizado (o el Administrador) puede rechazar la solicitud.';
  end if;
  if v_reg.etapa <> 1 or v_reg.borrador or v_reg.cerrado or v_reg.resultado = 'Rechazada' then
    raise exception 'La solicitud no está en la etapa de Evaluación y Aprobación.';
  end if;
  if not texto_lleno(p_motivo) then raise exception 'Escriba el motivo en el campo de comentario.'; end if;

  perform anotar(p_id, 'Solicitud rechazada: ' || btrim(p_motivo));
  update registros set resultado = 'Rechazada', cerrado = true, fecha_cierre = now(),
    version = version + 1, actualizado_en = now()
  where id = p_id returning * into v_nuevo;
  return v_nuevo;
end $$;

-- Solo el Administrador: vuelve de Cierre a Evaluación y Aprobación para corregir.
-- Se anulan las firmas de esa etapa y de la siguiente para firmarlas de nuevo.
create or replace function retroceder_etapa(p_id text, p_comentario text default '') returns registros
language plpgsql security definer set search_path = public as $$
declare v_reg registros; v_nuevo registros;
begin
  v_reg := cargar_registro(p_id);
  if not es_admin() then raise exception 'Solo el Administrador puede retroceder una etapa.'; end if;
  if v_reg.etapa <> 2 or v_reg.cerrado or v_reg.resultado = 'Rechazada' then
    raise exception 'Solo se puede retroceder una solicitud que está en Cierre y sigue abierta.';
  end if;
  perform anotar(p_id, coalesce(nullif(btrim(p_comentario), ''), 'Etapa retrocedida por el Administrador.')
    || ' Se anulan las firmas desde la etapa Evaluación y Aprobación para volver a aprobarlas.');
  delete from firmas where registro_id = p_id and espacio in ('aprob', 'cierre');
  update registros set etapa = 1, version = version + 1, actualizado_en = now()
  where id = p_id returning * into v_nuevo;
  return v_nuevo;
end $$;

-- ---------------------------------------------------------------
-- Cambios que solo hacen ciertos roles
-- ---------------------------------------------------------------
-- Convierte una desviación recurrente en derogación (activa el 8D).
create or replace function convertir_a_derogacion(p_id text) returns registros
language plpgsql security definer set search_path = public as $$
declare v_reg registros; v_nuevo registros;
begin
  v_reg := cargar_registro(p_id);
  if mi_rol() not in ('Aprobador autorizado', 'Administrador') then
    raise exception 'Solo el Aprobador autorizado (o el Administrador) puede convertir una desviación en derogación.';
  end if;
  if v_reg.tipo_gestion <> 'Desviación' or v_reg.etapa <> 1 or v_reg.borrador or v_reg.cerrado or v_reg.resultado = 'Rechazada' then
    raise exception 'Solo se puede convertir una desviación abierta que esté en Evaluación y Aprobación.';
  end if;
  perform anotar(p_id, 'Convertida de desviación a derogación por recurrencia. Se activa el análisis 8D.');
  update registros set tipo_gestion = 'Derogación',
    data = data || jsonb_build_object('tipoGestion', 'Derogación', 'd8Started', true, 'alcanceDerogacion', 'Temporal'),
    version = version + 1, actualizado_en = now()
  where id = p_id returning * into v_nuevo;
  return v_nuevo;
end $$;

-- Ajusta si la derogación es temporal (rango de fechas) o definitiva (fecha efectiva).
-- Lo pueden hacer el Aprobador, el Administrador o quien hizo la solicitud, durante la evaluación.
create or replace function ajustar_alcance_derogacion(p_id text, p_alcance text, p_inicio text, p_fin text default '')
returns registros
language plpgsql security definer set search_path = public as $$
declare
  v_reg registros; v_nuevo registros;
  v_def boolean := p_alcance = 'Definitiva';
  v_nuevo_datos jsonb;
  v_error text;
  v_antes text;
begin
  v_reg := cargar_registro(p_id);
  if p_alcance not in ('Temporal', 'Definitiva') then raise exception 'El alcance debe ser Temporal o Definitiva.'; end if;
  if not (mi_rol() in ('Aprobador autorizado', 'Administrador') or v_reg.reportado_por_id = auth.user_id()) then
    raise exception 'No puede ajustar el alcance de esta derogación.';
  end if;
  if v_reg.tipo_gestion <> 'Derogación' or v_reg.etapa <> 1 or v_reg.borrador or v_reg.cerrado or v_reg.resultado = 'Rechazada' then
    raise exception 'El alcance solo se ajusta en una derogación abierta, durante la Evaluación y Aprobación.';
  end if;

  v_nuevo_datos := jsonb_build_object('tipoGestion', 'Derogación', 'alcanceDerogacion', p_alcance,
    'fechaEfectiva', case when v_def then coalesce(p_inicio, '') else '' end,
    'vigenciaInicio', coalesce(p_inicio, ''), 'vigenciaFin', case when v_def then '' else coalesce(p_fin, '') end);
  v_error := validar_vigencia(v_nuevo_datos);
  if v_error <> '' then raise exception '%', v_error; end if;

  v_antes := vigencia_texto(v_reg.tipo_gestion, v_reg.data);
  perform anotar(p_id, 'Alcance de la derogación ajustado: ' || v_antes || ' → ' || vigencia_texto('Derogación', v_nuevo_datos) || '.');
  update registros set
    data = data || (v_nuevo_datos - 'tipoGestion'),
    vigencia_inicio = nullif(p_inicio, '')::date,
    vigencia_fin = case when v_def then null else nullif(p_fin, '')::date end,
    version = version + 1, actualizado_en = now()
  where id = p_id returning * into v_nuevo;
  return v_nuevo;
end $$;

-- ---------------------------------------------------------------
-- Archivos adjuntos
-- ---------------------------------------------------------------
-- El archivo ya está guardado en la tabla "archivos"; aquí solo se anota su nombre y su ruta.
-- El archivo debe estar en la carpeta de su propio registro: registros/<consecutivo>/<archivo>.
-- (El nombre que ve la gente va en p_nombre; el nombre del archivo guardado usa solo letras y números.)
-- Máximo 5 MB por archivo y 50 por registro, para cuidar el espacio gratuito.
create or replace function registrar_adjunto(p_id text, p_nombre text, p_tipo text, p_tamano bigint, p_ruta text)
returns adjuntos
language plpgsql security definer set search_path = public as $$
declare
  v_reg registros; v_perfil perfiles; v_adj adjuntos;
begin
  v_reg := cargar_registro(p_id);
  select * into v_perfil from perfiles where id = auth.user_id() and activo;
  if v_reg.cerrado or v_reg.resultado = 'Rechazada' then raise exception 'El registro está cerrado y no admite más archivos.'; end if;
  if not texto_lleno(p_nombre) then raise exception 'El archivo no tiene nombre.'; end if;
  if p_tamano is null or p_tamano <= 0 or p_tamano > 5 * 1048576 then raise exception 'Cada archivo puede pesar hasta 5 MB.'; end if;
  if coalesce(p_ruta, '') !~ ('^registros/' || v_reg.id || '/[A-Za-z0-9._() -]+$') or p_ruta like '%..%' then
    raise exception 'La ruta del archivo no es válida.';
  end if;
  if exists (select 1 from adjuntos where ruta = p_ruta) then raise exception 'Ese archivo ya está registrado.'; end if;
  if not exists (select 1 from archivos where ruta = p_ruta and tamano = p_tamano) then
    raise exception 'Primero hay que subir el archivo.';
  end if;
  if (select count(*) from adjuntos where registro_id = p_id) >= 50 then raise exception 'Este registro ya tiene el máximo de 50 archivos.'; end if;

  insert into adjuntos (registro_id, nombre, tipo, tamano, ruta, subido_por)
  values (p_id, left(p_nombre, 200), left(coalesce(p_tipo, ''), 100), p_tamano, p_ruta, v_perfil.nombre)
  returning * into v_adj;
  perform anotar(p_id, 'Adjuntó el archivo ' || left(p_nombre, 200) || '.');
  return v_adj;
end $$;

-- ---------------------------------------------------------------
-- Restaurar y administrar áreas (Administrador)
-- ---------------------------------------------------------------
-- Vuelve a crear un registro eliminado a partir de la copia guardada en la huella.
create or replace function restaurar_registro(p_huella uuid) returns registros
language plpgsql security definer set search_path = public as $$
declare
  v_h auditoria_eliminados; v_perfil perfiles; v_nuevo registros; v_copia jsonb;
begin
  if not es_admin() then raise exception 'Solo el Administrador puede restaurar registros.'; end if;
  select * into v_h from auditoria_eliminados where id = p_huella for update;
  if v_h.id is null then raise exception 'No se encontró esa huella.'; end if;
  if v_h.restaurado then raise exception 'Este registro ya fue restaurado.'; end if;
  if exists (select 1 from registros where id = v_h.registro_id) then
    raise exception 'Ya existe un registro con el consecutivo %.', v_h.registro_id;
  end if;
  select * into v_perfil from perfiles where id = auth.user_id();
  v_copia := v_h.copia;

  insert into registros select * from jsonb_populate_record(null::registros, v_copia -> 'registro');
  insert into bitacora (registro_id, etapa, rol, usuario, fecha, comentario, creado_en)
    select registro_id, etapa, rol, usuario, fecha, comentario, creado_en
    from jsonb_populate_recordset(null::bitacora, v_copia -> 'bitacora') order by id;
  insert into firmas select * from jsonb_populate_recordset(null::firmas, v_copia -> 'firmas');
  insert into adjuntos select * from jsonb_populate_recordset(null::adjuntos, v_copia -> 'adjuntos');

  perform anotar(v_h.registro_id, 'Registro restaurado por ' || v_perfil.nombre || '. Había sido eliminado por '
    || v_h.eliminado_por || ' el ' || to_char(v_h.creado_en at time zone 'America/Bogota', 'YYYY-MM-DD HH24:MI')
    || ' (motivo: ' || v_h.motivo || ').');
  update registros set version = version + 1, actualizado_en = now() where id = v_h.registro_id returning * into v_nuevo;
  update auditoria_eliminados set restaurado = true, restaurado_por = v_perfil.nombre, restaurado_en = now() where id = p_huella;
  return v_nuevo;
end $$;

-- Cambia el nombre de un área en todas partes (registros, personas y tipos).
create or replace function renombrar_area(p_viejo text, p_nuevo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_nuevo text := btrim(coalesce(p_nuevo, ''));
begin
  if not es_admin() then raise exception 'Solo el Administrador puede cambiar las áreas.'; end if;
  if v_nuevo = '' then raise exception 'El nombre del área no puede quedar vacío.'; end if;
  if not exists (select 1 from areas where nombre = p_viejo) then raise exception 'No existe esa área.'; end if;
  if v_nuevo <> p_viejo and exists (select 1 from areas where lower(nombre) = lower(v_nuevo)) then
    raise exception 'Ya existe un área con ese nombre.';
  end if;
  update areas set nombre = v_nuevo where nombre = p_viejo;          -- los tipos se actualizan solos
  update registros set area = v_nuevo, version = version + 1, actualizado_en = now(),
    data = data || jsonb_build_object('area', v_nuevo)
      || case when data ->> 'tema' = p_viejo then jsonb_build_object('tema', v_nuevo) else '{}'::jsonb end
  where area = p_viejo;
  update perfiles set area = v_nuevo where area = p_viejo;
end $$;

-- ---------------------------------------------------------------
-- Quién puede llamar cada función
-- ---------------------------------------------------------------
revoke all on function vigencia_texto(text, jsonb) from public, anon, authenticated;

revoke all on function enviar_registro(text, int, jsonb, text), firmar_etapa(text, text, text, text),
  quitar_firma_admin(text), devolver_registro(text, text), rechazar_registro(text, text),
  retroceder_etapa(text, text), convertir_a_derogacion(text), ajustar_alcance_derogacion(text, text, text, text),
  registrar_adjunto(text, text, text, bigint, text), restaurar_registro(uuid), renombrar_area(text, text)
  from public, anon;
grant execute on function enviar_registro(text, int, jsonb, text), firmar_etapa(text, text, text, text),
  quitar_firma_admin(text), devolver_registro(text, text), rechazar_registro(text, text),
  retroceder_etapa(text, text), convertir_a_derogacion(text), ajustar_alcance_derogacion(text, text, text, text),
  registrar_adjunto(text, text, text, bigint, text), restaurar_registro(uuid), renombrar_area(text, text)
  to authenticated;
