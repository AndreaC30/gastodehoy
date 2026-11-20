# Pruebas pendientes en móvil y lector de pantalla

Lo que ni `pytest`, ni `npm run build`, ni los medidores (`tools/check_contrast.py`, `tools/check_i18n.py`) pueden comprobar. Hay que hacerlo a mano antes de publicar una versión. Marca cada punto con fecha y dispositivo.

## iPhone (Safari)

- [ ] La barra inferior queda pegada abajo al hacer scroll y no tapa el último elemento de la lista (con y sin el aviso de cookies).
- [ ] Los cinco botones se pulsan bien con el pulgar; «Añadir» abre la hoja y el teclado decimal sale al tocar el importe.
- [ ] La hoja «Añadir gasto»: el teclado no tapa el botón «Registrar»; al guardar, la hoja se cierra y el importe aparece en Hoy.
- [ ] Modo oscuro y claro: cambiar el tema repinta la barra de estado y no deja un hueco negro sobre la barra inferior.
- [ ] Girar el teléfono no rompe el diseño ni deja scroll horizontal.
- [ ] Texto grande (Ajustes del sistema > Tamaño del texto al máximo): nada se corta ni se solapa.

## Android (Chrome)

- [ ] Lo mismo que en iPhone, y además: el scroll de las secciones no «desgarra» (un fallo conocido de Chrome Android con capas propias).
- [ ] El botón Atrás del sistema cierra hojas y menús antes de salir de la app.
- [ ] Menú del navegador > «Instalar aplicación» ofrece instalar.

## PWA instalada (iPhone y Android)

- [ ] Instalar desde cero: icono correcto, nombre «GastoDeHoy», pantalla de lanzamiento sin franjas.
- [ ] Abrir sin conexión: qué se ve y qué mensaje sale (la cola sin conexión es de la Fase 5).
- [ ] Desplegar una versión nueva con la app abierta: la app recoge la versión nueva (`skipWaiting` y `clientsClaim`) sin quedarse a medias.
- [ ] Avisos diarios: el permiso se pide, llega el aviso de las 20:30 y se abre la app. En iPhone solo funcionan con la app en la pantalla de inicio.
- [ ] El atajo «Añadir gasto» del icono abre la hoja.

## Lector de pantalla (VoiceOver en iPhone, TalkBack en Android, y NVDA o VoiceOver en escritorio)

- [ ] Hoy: se anuncia el importe de hoy una sola vez, sin leer la animación; el ritmo del mes se lee como «Vas bien / Vas justo / Te pasas» con su frase.
- [ ] La barra inferior: cada botón se anuncia con nombre y el activo como «actual»; «Más» abre el menú y el foco entra en él.
- [ ] Formularios: cada campo se lee con su etiqueta; los errores se anuncian al enviar y el foco queda cerca del error.
- [ ] Hojas y diálogos: el foco entra al abrir, queda atrapado y vuelve al botón que los abrió al cerrar.
- [ ] Guardar un gasto, borrarlo y deshacer: el aviso se anuncia y «Deshacer» se puede pulsar.
- [ ] Idiomas: cambiar a fr y de, y comprobar que el lector cambia de voz (atributo `lang`) y que ningún botón queda cortado.

## Guía paso a paso

- [ ] La guía arranca desde Más, recorre los pasos y cada paso señala algo visible (no un elemento oculto en móvil).
- [ ] Enter avanza y Escape la cierra; con el lector de pantalla se oye el texto de cada paso.
- [ ] Al terminar, el aviso «Guía completada» aparece y el foco no se pierde.

## Revisión humana de idiomas

- [ ] Una persona nativa revisa fr y de (la revisión hecha en la Fase 6 es de un modelo): ver la lista de frases dudosas del PR de la Fase 6. Los textos legales y de privacidad piden además revisión jurídica.
