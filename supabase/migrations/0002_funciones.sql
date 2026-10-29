-- BASE DE DATOS v2 · Gestión de Desviaciones y Derogaciones MATEC
-- Paso 2 de 3: ayudas internas y funciones para crear, guardar y eliminar.--
-- Ejecutar DESPUÉS de 0001_tablas_y_permisos.sql.
--
-- La aplicación ya no escribe directo en las tablas. Llama a estas funciones y ellas
-- comprueban quién es la persona y si puede hacer lo que pide.
-- Las funciones de firmar, devolver, rechazar, etc. están en 0003_flujo.sql.

-- ---------------------------------------------------------------
-- Ayudas internas (las personas no las llaman directamente)
-- ---------------------------------------------------------------

-- ¿El texto tiene algo escrito? (un espacio o un salto de línea no cuenta)
create or replace function texto_lleno(v text) returns boolean
language sql immutable as $$ select coalesce(v, '') ~ '\S' $$;

-- Dice qué le falta al reporte 8D. Si la lista sale vacía, el 8D está completo.
-- Es la misma revisión que hace la pantalla (src/dominio/d8.js), repetida aquí
-- para que nadie pueda aprobar una derogación con el 8D incompleto.
create or replace function d8_faltantes(d jsonb) returns text[]
language plpgsql immutable as $$
declare
  falta text[] := '{}';
  faltan text[];
  campos text[] := array['d1','D1 · Equipo', 'd4','D4 · Causa raíz', 'd6','D6 · Implementación y validación',
                         'd7','D7 · Acciones preventivas', 'd8','D8 · Cierre y reconocimiento'];
  w2h text[] := array['what','What', 'where','Where', 'when','When', 'who','Who', 'why','Why', 'how','How', 'howMuch','How much'];
  cols text[];
  nom text; prop text; fila jsonb; n int; hay boolean;
  i int; t int; c int;
begin
  d := coalesce(d, '{}'::jsonb);

  for i in 0..(array_length(campos, 1) / 2 - 1) loop
    if not texto_lleno(d ->> campos[i*2+1]) then falta := falta || campos[i*2+2]; end if;
  end loop;

  faltan := '{}';
  for i in 0..(array_length(w2h, 1) / 2 - 1) loop
    if not texto_lleno(d -> 'w2h' ->> w2h[i*2+1]) then faltan := faltan || w2h[i*2+2]; end if;
  end loop;
  if array_length(faltan, 1) > 0 then falta := falta || ('D2 · 5W2H (' || array_to_string(faltan, ', ') || ')'); end if;

  faltan := '{}';
  for i in 0..2 loop
    if not texto_lleno(d -> 'whys' ->> i) then faltan := faltan || ('Porqué ' || (i + 1)); end if;
  end loop;
  if array_length(faltan, 1) > 0 then falta := falta || ('D4 · 5 Porqués (' || array_to_string(faltan, ', ') || ')'); end if;

  -- D3 y D5: al menos una fila completa y ninguna a medias
  for t in 1..2 loop
    if t = 1 then
      prop := 'contencion'; nom := 'D3 · Acciones de contención';
      cols := array['accion','Acción de contención', 'puntoControl','Punto de control', 'fecha','Fecha de realización', 'responsable','Responsable'];
    else
      prop := 'correctivas'; nom := 'D5 · Acciones correctivas permanentes';
      cols := array['causa','Causa', 'accion','Acción correctiva', 'fecha','Fecha de realización', 'responsable','Responsable'];
    end if;
    n := 0;
    if jsonb_typeof(d -> prop) = 'array' then
      for fila in select value from jsonb_array_elements(d -> prop) loop
        hay := false;
        for c in 0..3 loop if texto_lleno(fila ->> cols[c*2+1]) then hay := true; end if; end loop;
        if hay then
          n := n + 1;
          faltan := '{}';
          for c in 0..3 loop if not texto_lleno(fila ->> cols[c*2+1]) then faltan := faltan || cols[c*2+2]; end if; end loop;
          if array_length(faltan, 1) > 0 then
            falta := falta || (nom || ' fila ' || n || ' (' || array_to_string(faltan, ', ') || ')');
          end if;
        end if;
      end loop;
    end if;
    if n = 0 then falta := falta || (nom || ' (registre al menos una)'); end if;
  end loop;

  return falta;
end $$;

-- Revisa el tema, el tipo y las fechas. Devuelve el mensaje de error, o vacío si todo está bien.
-- Mismas reglas y mismos textos que validarVigencia en src/dominio/registro.js.
create or replace function validar_vigencia(d jsonb) returns text
language plpgsql immutable as $$
declare
  ini text := coalesce(d ->> 'vigenciaInicio', '');
  fin text := coalesce(d ->> 'vigenciaFin', '');
  ef  text := coalesce(d ->> 'fechaEfectiva', '');
begin
  if d ->> 'temaOtro' = 'true' and not texto_lleno(d ->> 'tema') then
    return 'Escriba el tema de la solicitud (opción "Otro").';
  end if;
  if d ->> 'tipoEspecificoOtro' = 'true' and not texto_lleno(d ->> 'tipoEspecifico') then
    return 'Escriba el tipo específico de desviación o derogación (opción "Otro").';
  end if;
  if d ->> 'tipoGestion' = 'Derogación' then
    if d ->> 'alcanceDerogacion' = 'Definitiva' then
      if ef = '' then return 'Indique la fecha a partir de la cual la derogación será efectiva de forma permanente.'; end if;
    else
      if ini = '' or fin = '' then return 'Indique el rango de fechas (desde y hasta) de la derogación temporal.'; end if;
      if fin < ini then return 'La fecha final de la derogación temporal no puede ser anterior a la fecha inicial.'; end if;
    end if;
  elsif ini <> '' and fin <> '' and fin < ini then
    return 'La fecha final de la vigencia no puede ser anterior a la fecha inicial.';
  end if;
  return '';
end $$;

-- Evita que alguien llene la base de datos con un solo registro enorme.
-- Los archivos y las firmas no van aquí: se suben aparte.
create or replace function validar_tamano(d jsonb) returns void
language plpgsql immutable as $$
begin
  if octet_length(d::text) > 262144 then
    raise exception 'El contenido es demasiado grande (máximo 256 KB). Los archivos se adjuntan aparte.';
  end if;
end $$;

-- ¿La ruta de la imagen de una firma es válida? Debe ser firmas/<mi identificador>/<archivo>.
-- Así nadie puede usar la imagen de firma de otra persona, ni apuntar al adjunto de otro registro.
create or replace function ruta_firma_valida(p text) returns boolean
language sql stable as $$
  select coalesce(p, '') ~ '^firmas/[A-Za-z0-9_-]+/[A-Za-z0-9._-]+$'
     and coalesce(p, '') not like '%..%'
     and split_part(coalesce(p, ''), '/', 2) = coalesce(auth.uid()::text, '')
$$;

-- Devuelve el contenido nuevo, pero con los valores anteriores en las claves indicadas.
-- Sirve para que una persona no pueda cambiar campos que no le corresponden.
create or replace function conservar_campos(p_viejo jsonb, p_nuevo jsonb, p_claves text[]) returns jsonb
language plpgsql immutable as $$
declare
  k text;
  r jsonb := p_nuevo;
begin
  foreach k in array p_claves loop
    r := case when p_viejo ? k then r || jsonb_build_object(k, p_viejo -> k) else r - k end;
  end loop;
  return r;
end $$;

-- Siguiente número de consecutivo: MTC-001, MTC-002...
create or replace function siguiente_consecutivo() returns text
language sql security definer set search_path = public as $$
  select 'MTC-' || lpad(nextval('registros_consecutivo')::text, 3, '0')
$$;

-- Busca un registro, lo bloquea mientras se trabaja con él y comprueba que la persona pueda verlo.
create or replace function cargar_registro(p_id text) returns registros
language plpgsql security definer set search_path = public as $$
declare v_reg registros;
begin
  select * into v_reg from registros where id = p_id for update;
  if v_reg.id is null or not puede_ver_registro(v_reg) then raise exception 'No se encontró el registro.'; end if;
  return v_reg;
end $$;

-- Escribe una línea en la bitácora a nombre de quien está usando la aplicación.
-- Se llama ANTES de cambiar la etapa, para que quede la etapa en la que ocurrió.
create or replace function anotar(p_id text, p_comentario text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reg registros;
  v_perfil perfiles;
begin
  select * into v_reg from registros where id = p_id;
  select * into v_perfil from perfiles where id = auth.uid();
  insert into bitacora (registro_id, etapa, rol, usuario, comentario)
  values (p_id, (array['Solicitud','Evaluación y Aprobación','Cierre'])[v_reg.etapa + 1],
          coalesce(v_perfil.rol, ''), coalesce(v_perfil.nombre, ''), p_comentario);
end $$;

-- Lo que debe estar lleno antes de firmar cada etapa. Si la lista sale vacía, ya se puede firmar.
create or replace function requisitos_firma(r registros, p_espacio text) returns text[]
language plpgsql immutable as $$
declare
  falta text[] := '{}';
  v8 text[];
begin
  if p_espacio = 'aprob' then
    if not texto_lleno(r.data ->> 'conceptoEvaluacion') then falta := falta || 'concepto de evaluación'::text; end if;
    if not texto_lleno(r.data ->> 'controlesCompensatorios') then falta := falta || 'medidas de control'::text; end if;
    if r.tipo_gestion = 'Derogación' then
      v8 := d8_faltantes(r.data -> 'd8');
      if array_length(v8, 1) > 0 then falta := falta || ('reporte 8D completo (' || array_to_string(v8, '; ') || ')'); end if;
    end if;
  elsif p_espacio = 'cierre' then
    if not texto_lleno(r.data ->> 'observacionesCierre') then falta := falta || 'observaciones de cierre'::text; end if;
    if not texto_lleno(r.data ->> 'cumplimientoControl') then falta := falta || 'cumplimiento de controles'::text; end if;
  end if;
  return falta;
end $$;

-- ---------------------------------------------------------------
-- Crear, guardar y eliminar
-- ---------------------------------------------------------------

-- Crea una solicitud nueva.
--  * Como borrador: queda con un código temporal BOR-xxxx y sin firma.
--  * Enviada: recibe su consecutivo MTC-###, se firma y pasa a Evaluación y Aprobación.
-- p_firma_ruta es la ruta de la imagen de la firma, ya subida a Storage.
create or replace function crear_registro(p_data jsonb, p_borrador boolean default false, p_firma_ruta text default '')
returns registros
language plpgsql security definer set search_path = public as $$
declare
  v_perfil perfiles;
  v_reg registros;
  v_id text;
  v_error text;
begin
  select * into v_perfil from perfiles where id = auth.uid() and activo;
  if v_perfil.id is null then raise exception 'No tiene acceso a la aplicación.'; end if;
  if v_perfil.rol not in ('Responsable del proceso','Administrador') then
    raise exception 'Su rol no puede crear solicitudes.';
  end if;
  perform validar_tamano(p_data);
  if coalesce(p_data ->> 'tipoGestion', '') not in ('Desviación','Derogación') then
    raise exception 'Indique si es una Desviación o una Derogación.';
  end if;
  if not texto_lleno(p_data ->> 'area') then raise exception 'Indique el área a la que va dirigida la solicitud.'; end if;
  if not p_borrador then
    if not ruta_firma_valida(p_firma_ruta) then raise exception 'Dibuje su firma en el recuadro antes de enviar la solicitud.'; end if;
    v_error := validar_vigencia(p_data);
    if v_error <> '' then raise exception '%', v_error; end if;
  end if;

  v_id := case when p_borrador then 'BOR-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
               else siguiente_consecutivo() end;

  insert into registros (id, tipo_gestion, area, etapa, borrador, reportado_por_id, reportado_por,
                         criticidad, vigencia_inicio, vigencia_fin, data)
  values (v_id, p_data ->> 'tipoGestion', p_data ->> 'area',
          case when p_borrador then 0 else 1 end, p_borrador,
          v_perfil.id, v_perfil.nombre,
          coalesce(p_data ->> 'criticidad', ''),
          nullif(p_data ->> 'vigenciaInicio', '')::date, nullif(p_data ->> 'vigenciaFin', '')::date,
          p_data)
  returning * into v_reg;

  insert into bitacora (registro_id, etapa, rol, usuario, comentario)
  values (v_id, 'Solicitud', v_perfil.rol, v_perfil.nombre,
          case when p_borrador then 'Borrador creado.' else 'Solicitud creada y firmada.' end);

  if not p_borrador then
    insert into firmas (registro_id, espacio, usuario_id, nombre, rol, ruta_imagen)
    values (v_id, 'sol', v_perfil.id, v_perfil.nombre, v_perfil.rol, p_firma_ruta);
  end if;

  return v_reg;
end $$;

-- Guarda cambios del contenido de un registro.
-- Hay que enviar la "version" que se tenía abierta. Si alguien más lo cambió mientras tanto,
-- la función avisa (conflicto_version) en vez de borrar lo que esa otra persona escribió.
-- No permite cambiar la etapa, el cierre ni el resultado: eso lo hacen las funciones de firma.
-- Además, cada rol solo puede llenar sus propios campos y solo en su etapa:
--  * concepto de evaluación y medidas de control: Aprobador o Administrador, en Evaluación y Aprobación.
--  * observaciones de cierre y cumplimiento: quien hizo la solicitud o el Administrador, en Cierre.
create or replace function guardar_registro(p_id text, p_version int, p_data jsonb)
returns registros
language plpgsql security definer set search_path = public as $$
declare
  v_reg registros;
  v_nuevo registros;
  v_rol text := mi_rol();
  v_datos jsonb := p_data;
begin
  v_reg := cargar_registro(p_id);
  perform validar_tamano(p_data);
  if v_reg.cerrado or v_reg.resultado = 'Rechazada' then raise exception 'El registro ya está cerrado y no se puede editar.'; end if;
  if v_rol = 'Responsable del proceso' and v_reg.reportado_por_id is distinct from auth.uid()
     and coalesce(mi_area(), '') <> v_reg.area then
    raise exception 'No puede editar este registro.';
  end if;
  if v_reg.version <> p_version then
    raise exception 'conflicto_version' using errcode = 'P0001',
      hint = 'Otra persona cambió este registro mientras usted lo editaba. Vuelva a abrirlo.';
  end if;

  -- Campos de la evaluación: si no le corresponden, se conserva lo que ya había.
  -- Las medidas de control también las escribe quien hace la solicitud mientras es borrador, por eso ahí no se protegen.
  if not (v_rol in ('Aprobador autorizado', 'Administrador') and v_reg.etapa = 1) then
    v_datos := conservar_campos(v_reg.data, v_datos,
      case when v_reg.borrador then array['conceptoEvaluacion', 'observacionesAprobacion']::text[]
           else array['conceptoEvaluacion', 'controlesCompensatorios', 'observacionesAprobacion']::text[] end);
  end if;
  -- Campos del cierre.
  if not (v_reg.etapa = 2 and (v_rol = 'Administrador' or v_reg.reportado_por_id = auth.uid())) then
    v_datos := conservar_campos(v_reg.data, v_datos, array['observacionesCierre', 'cumplimientoControl']);
  end if;
  -- Ya enviada, la solicitud no cambia de figura ni de área por aquí
  -- (convertir_a_derogacion y renombrar_area son las funciones para eso).
  if not v_reg.borrador then
    v_datos := v_datos || jsonb_build_object('tipoGestion', v_reg.tipo_gestion, 'area', v_reg.area);
  end if;

  update registros set
    tipo_gestion = coalesce(nullif(v_datos ->> 'tipoGestion', ''), tipo_gestion),
    area = coalesce(nullif(v_datos ->> 'area', ''), area),
    criticidad = coalesce(v_datos ->> 'criticidad', criticidad),
    vigencia_inicio = nullif(v_datos ->> 'vigenciaInicio', '')::date,
    vigencia_fin = nullif(v_datos ->> 'vigenciaFin', '')::date,
    data = v_datos,             -- la etapa y el estado los vuelve a poner la base de datos (disparador de 0001)
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
  if length(trim(coalesce(p_motivo, ''))) < 5 then raise exception 'Escriba el motivo de la eliminación.'; end if;
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

-- ---------------------------------------------------------------
-- Quién puede llamar cada función
-- ---------------------------------------------------------------
-- Las ayudas internas no las puede llamar nadie desde la aplicación.
revoke all on function siguiente_consecutivo(), cargar_registro(text), anotar(text, text), conservar_campos(jsonb, jsonb, text[]),
  requisitos_firma(registros, text), d8_faltantes(jsonb), validar_vigencia(jsonb), validar_tamano(jsonb), texto_lleno(text),
  ruta_firma_valida(text)
  from public, anon, authenticated;

-- Las funciones de uso normal: solo personas con sesión.
revoke all on function crear_registro(jsonb, boolean, text), guardar_registro(text, int, jsonb),
  eliminar_registro(text, text), marcar_clave_cambiada(), uso_almacenamiento() from public, anon;
grant execute on function crear_registro(jsonb, boolean, text), guardar_registro(text, int, jsonb),
  eliminar_registro(text, text), marcar_clave_cambiada(), uso_almacenamiento() to authenticated;
