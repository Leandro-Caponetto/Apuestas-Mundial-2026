# Guia de usuario - Apuestas Mundial 2026

<p align="center">
  <img src="public/assets/logo.svg" alt="Logo FIFA World Cup 2026" width="220" />
</p>

**Apuestas Mundial 2026** es una app web para seguir la Copa del Mundo 2026, predecir resultados, consultar grupos, explorar equipos, ver el cuadro de eliminatorias y competir en un ranking global de usuarios.

La experiencia esta pensada como un juego simple: creas tu cuenta, completas tu perfil, haces tus predicciones y sumas puntos segun tus aciertos.

---

## Que podes hacer en la app

| Seccion | Para que sirve |
| --- | --- |
| **Fixture** | Ver partidos disponibles y cargar predicciones. |
| **Grupos** | Consultar los 12 grupos del Mundial 2026 y sus equipos. |
| **Eliminatorias** | Seguir el arbol de fase final, desde R32 hasta la final. |
| **Ranking** | Ver la tabla global de usuarios ordenada por puntaje. |
| **Perfil** | Cambiar tu nombre de usuario y subir una foto/avatar. |

---

## Primer ingreso

En la pantalla principal vas a encontrar el acceso al juego.

1. Ingresa tu email.
2. Ingresa una contrasena.
3. Si no tenes cuenta, usa **Registrarme**.
4. Si ya tenes cuenta, usa **Entrar al juego**.
5. Despues de registrarte, revisa tu email si Supabase solicita confirmacion.

> Nota: si aparece un mensaje de limite de registros, puede ser por el plan gratuito de Supabase, que limita la cantidad de emails por hora.

---

## Tu perfil

Cuando inicias sesion, aparece tu tarjeta de usuario con:

- Nombre visible.
- Foto o inicial de tu email.
- Puntaje actual.
- Posicion en el ranking.

Para editar tu perfil:

1. Hace click en tu avatar.
2. Cambia tu nombre de usuario.
3. Opcionalmente subi una foto.
4. Guarda los cambios.

La imagen de perfil debe pesar menos de **2 MB**.

---

## Fixture y predicciones

La pestana **Fixture** es la zona principal del juego.

Desde ahi podes:

- Ver los partidos cargados.
- Consultar equipos y fechas.
- Cargar tus pronosticos.
- Seguir el estado de cada partido.

Los partidos pueden estar en estos estados:

| Estado | Significado |
| --- | --- |
| **Pending** | El partido todavia no comenzo. |
| **Playing** | El partido esta en juego. |
| **Finished** | El partido ya termino. |

La app obtiene los partidos desde Supabase. Si no hay datos cargados, usa datos de ejemplo para que la interfaz siga funcionando.

---

## Grupos

En **Grupos** podes ver la fase inicial del torneo:

- 48 equipos.
- 12 grupos.
- 104 partidos en total.
- Partidos inaugurales destacados.

Tambien se muestran equipos pendientes como **TBD** cuando aun no hay informacion completa cargada.

---

## Eliminatorias

La seccion **Eliminatorias** muestra el camino hacia la final:

1. R32.
2. R16.
3. Cuartos.
4. Semifinal.
5. Final.

Cuando un administrador carga resultados, la app puede promover automaticamente al ganador a la siguiente ronda si el marcador no queda empatado.

---

## Ranking mundial

El **Ranking** ordena a los usuarios por puntos.

Cada fila muestra:

- Posicion.
- Avatar.
- Nombre de usuario.
- Puntaje total.

Tu usuario aparece resaltado cuando estas conectado.

---

## Imagenes de la app

### Logo principal

![Logo Mundial 2026](public/assets/logo.svg)

### Pantallas recomendadas para completar la guia

Cuando tengas capturas reales de la app, podes guardarlas en `public/assets/` y agregarlas asi:

```md
![Pantalla de inicio](public/assets/screenshot-home.png)
![Fixture y predicciones](public/assets/screenshot-fixture.png)
![Ranking mundial](public/assets/screenshot-ranking.png)
```

Capturas sugeridas:

| Captura | Que deberia mostrar |
| --- | --- |
| `screenshot-home.png` | Portada, cuenta regresiva y acceso. |
| `screenshot-fixture.png` | Lista de partidos y centro de predicciones. |
| `screenshot-groups.png` | Grilla de grupos. |
| `screenshot-bracket.png` | Arbol de eliminatorias. |
| `screenshot-ranking.png` | Tabla global de posiciones. |

---

## Funciones de administrador

Algunos controles solo aparecen para el usuario administrador configurado en la app.

El administrador puede:

- Inicializar la base de datos con equipos, partidos y bracket.
- Guardar cambios del bracket.
- Actualizar resultados de eliminatorias.
- Cargar datos iniciales desde los mocks del proyecto.

Actualmente el email administrador configurado es:

```txt
caponettopeppers@gmail.com
```

---

## Datos y almacenamiento

La app usa Supabase para:

- Autenticacion de usuarios.
- Perfiles.
- Ranking.
- Equipos.
- Partidos.
- Bracket del torneo.
- Avatares en Supabase Storage.

Tablas principales:

| Tabla | Uso |
| --- | --- |
| `profiles` | Usuarios, nombre, avatar y puntos. |
| `teams` | Equipos del Mundial. |
| `matches` | Partidos, estado y resultados. |
| `tournament_metadata` | Bracket guardado como metadata. |

Bucket de storage:

| Bucket | Uso |
| --- | --- |
| `avatars` | Fotos de perfil publicas. |

---

## Problemas frecuentes

### No puedo registrarme

Puede ser por confirmacion de email pendiente o por limite de emails del plan gratuito de Supabase.

### No puedo subir mi avatar

Verifica que:

- La imagen pese menos de 2 MB.
- Exista el bucket `avatars`.
- El bucket sea publico.
- Las politicas RLS permitan subir y leer imagenes.

### No aparecen partidos reales

Si Supabase no devuelve partidos, la app carga partidos de ejemplo. Para ver datos reales hay que inicializar o cargar la base de datos.

### El ranking no cambia

El ranking depende de los puntos guardados en los perfiles. Si los puntos no se actualizan, hay que revisar la logica de predicciones y permisos de Supabase.

---

## Resumen rapido

1. Registrate o inicia sesion.
2. Edita tu perfil.
3. Entra al Fixture.
4. Carga tus predicciones.
5. Revisa grupos y eliminatorias.
6. Competi por subir en el ranking mundial.

