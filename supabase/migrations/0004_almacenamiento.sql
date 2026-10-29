-- BASE DE DATOS v2 · Gestión de Desviaciones y Derogaciones MATEC
-- Paso 4: dónde se guardan los archivos adjuntos y las imágenes de las firmas.
--
-- Ejecutar DESPUÉS de 0003_flujo.sql.
--
-- Los archivos van en un bucket PRIVADO llamado "archivos" (nadie puede abrirlos con un enlace
-- público). Dos carpetas:
--   registros/<consecutivo>/<archivo>   los adjuntos de cada registro
--   firmas/<identificador de la persona>/<archivo>   las imágenes de las firmas
--
-- Quién puede qué:
--  * Subir un adjunto: quien puede ver ese registro, mientras siga abierto.
--  * Subir una firma: cada persona, solo en su propia carpeta.
--  * Leer un archivo: quien puede ver el registro al que pertenece (según lo anotado en las
--    tablas adjuntos y firmas).
--  * Nadie puede reemplazar ni borrar archivos desde la aplicación.
--
-- Tamaño: 5 MB por archivo. Tipos permitidos: imágenes, PDF, texto, Word, Excel y PowerPoint
-- (no se admiten programas ni archivos comprimidos).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('archivos', 'archivos', false, 5 * 1048576, array[
  'image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists archivos_leer on storage.objects;
create policy archivos_leer on storage.objects for select to authenticated
using (
  bucket_id = 'archivos' and (
    exists (select 1 from adjuntos a join registros r on r.id = a.registro_id
            where a.ruta = storage.objects.name and puede_ver_registro(r))
    or exists (select 1 from firmas f join registros r on r.id = f.registro_id
               where f.ruta_imagen = storage.objects.name and puede_ver_registro(r))
  )
);

drop policy if exists archivos_subir on storage.objects;
create policy archivos_subir on storage.objects for insert to authenticated
with check (
  bucket_id = 'archivos' and mi_rol() is not null and (
    -- adjuntos: solo a un registro que la persona ve y que sigue abierto
    ((storage.foldername(name))[1] = 'registros' and array_length(storage.foldername(name), 1) = 2
      and exists (select 1 from registros r
                  where r.id = (storage.foldername(name))[2] and puede_ver_registro(r)
                    and not r.cerrado and r.resultado <> 'Rechazada'))
    -- firmas: solo en la carpeta propia
    or ((storage.foldername(name))[1] = 'firmas' and array_length(storage.foldername(name), 1) = 2
        and (storage.foldername(name))[2] = auth.uid()::text)
  )
);

-- No hay políticas de update ni delete: lo subido no se reemplaza ni se borra desde la aplicación.
