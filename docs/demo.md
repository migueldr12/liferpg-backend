# Demostración local de Life-RPG

La demo usa `liferpg_test`, en el clúster configurado por el backend. No utiliza la base normal de la aplicación. Los datos de ejemplo incluyen cuatro usuarios, amistades, hábitos, misiones, inventario, stickers, un aviso y un reto. Los correos de ejemplo no son cuentas de Firebase y no tienen contraseña.

## Preparar los datos

En una terminal situada en `liferpg-backend`:

```powershell
npm run db:prepare-test
npm run db:seed-demo
```

El seed crea los registros que faltan sin borrar ni reiniciar los ya existentes. Por ello, repetirlo conserva los cambios realizados durante la demo; no funciona como un botón para restaurar el estado inicial. Las fechas iniciales se calculan al crear los datos.

## Arrancar la API

```powershell
npm run start:demo
```

La API escucha en el puerto configurado por `PORT` (3000 si no está configurado), usa `liferpg_test` y, en las rutas que admiten el usuario de desarrollo, identifica por defecto a Ana. En modo demo se deshabilita el envío FCM. Comprueba `http://localhost:3000/api/v1/estado` si el puerto es 3000.

También puedes ejecutar `npm run verify:demo` en otra terminal para comprobar las rutas principales contra la base de pruebas.

## Abrir la PWA

En otra terminal, en `liferpg-frontend`:

```powershell
npm run dev:demo
```

Abre la URL local que indique Vite y visita `/lite/amigos`. Esta modalidad usa Ana y se conecta por defecto a `http://localhost:3000/api/v1`. Para mostrar el panel administrativo, detén Vite y ejecuta:

```powershell
npm run dev:demo -- --admin
```

Abre `/admin/host` o `/admin/economia`. El cambio de usuario requiere reiniciar Vite.

Para abrir la PWA desde otro dispositivo de la misma red, define antes de arrancar Vite una URL accesible para ese dispositivo; por ejemplo, sustituye la IP y el puerto por los de la computadora que ejecuta la API:

```powershell
$env:VITE_DEMO_API_URL = 'http://192.168.1.20:3000/api/v1'
npm run dev:demo
```

Abre la dirección de red que muestre Vite, no `localhost` en el teléfono. El puerto de la API debe coincidir con `PORT`. La conexión depende de que ambos equipos estén en la misma red y el firewall permita el acceso.

## Recorridos sugeridos

- **Amigos:** ver la party, abrir el perfil de Beto o Carla y gestionar códigos.
- **Botín:** revisar el cofre de Ana y enviar una poción a Beto. Las operaciones modifican los datos de la demo.
- **Diario:** consultar hábitos y misiones, abrir una actividad y agregar una nota.
- **Ánimo:** ver el aviso de Carla, enviar un sticker y revisar el historial.
- **Progreso:** elegir una fecha para consultar pendientes, días de baja actividad y racha.
- **Retos:** consultar «Lectura en equipo» y las métricas; las aportaciones se calculan desde los registros.
- **Administración:** el monitor consulta la API, y Economía permite revisar la curva, el catálogo y los avisos. La purga sigue siendo una demostración; el respaldo restaurable está pendiente.

## App móvil

El código de la app móvil no está en este espacio de trabajo. Para conectarla, configura en su proyecto la URL de esta API, usando la IP de la computadora si se ejecuta en un teléfono. La app debe estar en modo de desarrollo compatible con el usuario de prueba del backend; una sesión Firebase real no se convierte automáticamente en Ana y puede crear otro usuario. Consulta la configuración y los pasos específicos del repositorio móvil antes de arrancarla.

El modo demo habilita identidad de desarrollo y CORS para facilitar las pruebas. Úsalo solo en una red de confianza y no lo despliegues como producción.
