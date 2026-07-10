# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) cuando trabaja con el código de este repositorio.

## Descripción

Aplicación web de lista de tareas personales (to-do list). Permite crear, organizar y completar tareas con soporte para subtareas, categorías con color, prioridades (baja/media/alta) y fecha de vencimiento. Al crear una tarea o marcarla como completada, se envía una notificación opcional a un chat de Telegram mediante un bot.

Es un proyecto educativo desarrollado en la Sesión 4 de la Especialización DMC.

## Proyecto

La aplicación se encuentra en `DMC_Ex_1/`. Todos los comandos deben ejecutarse desde ese directorio.

## Entorno (Windows)

Node.js v24 está instalado en `C:\Program Files\nodejs\` pero **no está en el PATH del sistema**. Usar siempre la ruta completa o agregarla manualmente:

```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
```

`better-sqlite3` requiere compilación nativa. Se resolvió actualizando a `v12+` (tiene binarios precompilados para Node 24) y aprobando el script de instalación con `npm approve-scripts better-sqlite3`.

## Comandos

```powershell
# Instalar dependencias (desde DMC_Ex_1/)
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npm install
npm approve-scripts better-sqlite3  # solo si npm lo solicita

# Iniciar servidor
node src/server.js

# Iniciar con reinicio automático ante cambios
node --watch src/server.js
```

El servidor arranca en `http://localhost:3000` (o en el puerto indicado por `$PORT`).

## Variables de entorno

Crea un archivo `.env` en `DMC_Ex_1/` para habilitar las notificaciones de Telegram (opcionales):

```
TELEGRAM_BOT_TOKEN=<token-del-bot>
TELEGRAM_CHAT_ID=<id-del-chat>
PORT=3000
```

Si estas variables no están definidas, las notificaciones se omiten silenciosamente.

## Arquitectura

**Backend** — Express (Node.js) con better-sqlite3 (síncrono, sin ORM).

- `src/server.js` — punto de entrada; monta los routers y sirve `public/` como archivos estáticos
- `src/db.js` — abre la base de datos SQLite (`src/data/todo.db`, se crea automáticamente), ejecuta las migraciones de esquema y siembra tres categorías por defecto en el primer arranque
- `src/routes/tasks.js` — CRUD completo de tareas y subtareas anidadas; dispara notificación de Telegram al crear una tarea y al marcarla como completada
- `src/routes/categories.js` — listar y crear categorías
- `src/services/telegram.js` — wrapper ligero sobre la API de Telegram Bot; nunca lanza excepciones

**Esquema de base de datos** — tres tablas: `categories`, `tasks` (FK → categories, `ON DELETE SET NULL`), `subtasks` (FK → tasks, `ON DELETE CASCADE`). La aplicación de claves foráneas está activada (`PRAGMA foreign_keys = ON`).

**Frontend** — SPA en vanilla JS en `public/` (sin paso de compilación, sin framework). `public/app.js` consulta la API REST y re-renderiza la lista completa de tareas tras cada mutación. El HTML se construye mediante manipulación del DOM; los textos ingresados por el usuario pasan por `escapeHtml()` antes de insertarse.

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/tasks` | Todas las tareas con subtareas, info de categoría y progreso |
| POST | `/api/tasks` | Crear tarea (`title` requerido) |
| PUT | `/api/tasks/:id` | Actualizar tarea (campos parciales permitidos) |
| DELETE | `/api/tasks/:id` | Eliminar tarea (elimina subtareas en cascada) |
| POST | `/api/tasks/:id/subtasks` | Agregar subtarea |
| PUT | `/api/tasks/:id/subtasks/:subtaskId` | Actualizar subtarea |
| DELETE | `/api/tasks/:id/subtasks/:subtaskId` | Eliminar subtarea |
| GET | `/api/categories` | Listar categorías |
| POST | `/api/categories` | Crear categoría (`name` requerido, `color` hex opcional) |
