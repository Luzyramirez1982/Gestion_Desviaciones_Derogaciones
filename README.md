# Gestión de Desviaciones y Derogaciones — MATEC

Aplicación web para gestionar **desviaciones y derogaciones** de proceso. Cada solicitud pasa por tres etapas (Solicitud → Evaluación y Aprobación → Cierre), con firma en cada una; las derogaciones exigen el reporte 8D completo. Hay tres roles: Administrador, Responsable del proceso y Aprobador autorizado.

**Estado:** la aplicación está publicada en Cloudflare Pages (https://desviaciones-matec.pages.dev) y conectada a Neon (base de datos, ingreso y archivos en el bucket). Falta activar el respaldo nocturno y probarlo, y hacer la limpieza final de datos de prueba antes de entregarla: ver [PLAN.md](PLAN.md). Sin `VITE_NEON_URL` la aplicación funciona en **modo demostración** (datos de ejemplo en memoria).

## Cómo correrla
```bash
npm install        # una sola vez
npm run dev        # abre la aplicación para verla y trabajar en ella
npm test           # pruebas automáticas (no necesitan internet; las de pantalla piden Node 22.22 o más nuevo)
npm run build      # genera la carpeta dist/ que se publica
```
En modo demostración se entra con cualquiera de estos correos y la contraseña `Demo2026`:
`admin@ejemplo.test` (Administrador), `calidad@ejemplo.test` y `produccion@ejemplo.test` (Responsables del proceso), `aprobador@ejemplo.test` (Aprobador autorizado).

## Mapa de carpetas
```
index.html            Página de entrada (casi vacía: la aplicación se arma con JavaScript)
public/               Archivos que se publican tal cual (cabeceras de seguridad)
src/
  main.js             Arranque
  estilos/            TODO lo visual está aquí, un archivo por tema
    base/               colores (variables.css) y punto de partida común
    layout/             esqueleto: menú lateral, cabecera, rejillas, versión móvil
    componentes/        botones, formularios, tarjetas, listas, modales, firmas...
    vistas/             estilos propios de una pantalla (ingreso, 8D, instructivo...)
  vistas/             Una pantalla por archivo (panel, lista, formulario, detalle, usuarios...)
  componentes/        Piezas reutilizables (íconos, avisos, firma en canvas, adjuntos, editor 8D)
  nucleo/             Armado de la aplicación: sesión, menú por rol y actualización en vivo
  dominio/            Reglas del procedimiento (etapas, firmas, 8D, vigencias). No es visual.
  datos/              Cómo se guardan y leen los datos (repositorio, adaptador de Neon y modo demostración)
  exportar/           PDF de trazabilidad y Excel histórico
  util/               Ayudas pequeñas (fechas de Colombia, textos seguros, imágenes...)
  auth/               Reglas de contraseña
db/migraciones/       Base de datos (SQL): tablas, permisos por rol/área/etapa, funciones del flujo, archivos y usuarios
functions/archivos/   Función de servidor que sube y entrega los archivos del bucket (guarda las claves; pregunta a la base si hay permiso)
scripts/              Aplicar migraciones, cargar el catálogo, crear a la primera Administradora y copiar/restaurar los archivos
tests/                Pruebas automáticas (las de base de datos corren en un PostgreSQL de prueba)
docs/                 Guías (poner en Neon, respaldos, manual del Administrador, cabeceras de seguridad)
```

## Para quien mejora lo visual
- **Colores y tipografía:** `src/estilos/base/`. Cambiar un color en `variables.css` lo cambia en toda la aplicación.
- **Cómo se ve cada pieza:** `src/estilos/componentes/` (un archivo por pieza) y `src/estilos/vistas/` (lo propio de una pantalla).
- **Qué HTML tiene cada pantalla:** `src/vistas/` y `src/componentes/`.
- **No tocar** `src/dominio/` ni `src/datos/`: son las reglas del procedimiento y el acceso a datos; si se cambian, hay que cambiar también las pruebas.
- Antes de subir cambios: `npm test` y `npm run build` deben pasar.

## Historia
La versión 1 (un solo `index.html`) sigue en la rama `main`. La nueva versión está en `feat/v2`. Las reglas que se escribieron primero para Supabase quedaron guardadas en la marca `referencia-supabase`; la base actual es Neon.
