# Apolo4

Apolo4 es una aplicación de escritorio para programar música local y crear anuncios de tienda con voces de ElevenLabs.

## Funciones incluidas

- Reproductor de archivos locales MP3, WAV, OGG, M4A, AAC y FLAC.
- Tres ambientes programables: **Mañana**, **Tarde** y **Noche**.
- Selección automática de la playlist según la hora del equipo.
- Reproducción afinada a 432 Hz mediante la relación 432/440.
- Texto a voz con ElevenLabs, incluyendo carga de voces en español y filtro por hombre/mujer.
- Panel de configuración con API Key guardada localmente en el equipo mediante el proceso de Electron.
- Reproducción independiente del anuncio sobre la música.
- Catálogo paginado de voces de tu cuenta y, si ElevenLabs lo permite en tu plan, voces compartidas en español por género, con muestra y opción de añadirlas a tu cuenta.
- Marca Apolo4 en el dashboard, favicon, icono de Windows y gráficos del instalador.

## Desarrollo

```bash
npm install
npm run dev
```

El sitio web de presentación está en `website/` y tiene sus propios comandos de vista previa y compilación:

```bash
npm run site:dev
npm run site:build
```

La compilación web queda en `website/dist/`, lista para alojarse como sitio estático.

## Compilación

```bash
npm run build
```

Para generar un instalador de Windows:

```bash
npm run dist
```

El archivo se crea en `release/` como `Apolo4-Setup-<versión>.exe`. El asistente permite elegir la carpeta de instalación, crea accesos directos en el escritorio y el menú Inicio, y abre Apolo4 al terminar. La configuración del usuario se conserva al desinstalar.

Los diseños fuente están en `assets/branding/`. Si se actualizan, se pueden regenerar los iconos y gráficos con `python scripts/prepare_branding.py` (requiere Pillow); el instalador usa los archivos generados de `public/branding/`, `build/` y `electron/assets/`.

Para preparar una actualización, incrementa `version` en `package.json` y vuelve a ejecutar `npm run dist`. Ejecutar el instalador de una versión posterior instala la actualización sobre la existente y mantiene los datos de usuario.

La primera vez que se ejecuta Electron puede tardar un poco mientras descarga su binario. La API Key nunca se incluye en el código fuente ni en el instalador; se guarda en el archivo de configuración de usuario de Apolo4 y se cifra cuando el sistema operativo lo permite.

La biblioteca de música se importa desde archivos locales para la sesión actual. Esto evita guardar URLs temporales inválidas; la persistencia por rutas de carpeta es el siguiente paso natural para una versión de producción.
