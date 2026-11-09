# Revisión de teclado, contraste y anchura estrecha

Fecha: 9 de noviembre de 2026.

Esta nota dice lo que se comprobó en esta pasada. No es una auditoría WCAG ni un dictamen. No dice que la app cumpla la Ley 11/2023.

## Cómo se miró

App local: Vite en `http://127.0.0.1:5174` contra la API en `127.0.0.1:8011`, con una SQLite temporal fuera del repo. No se usó gastodehoy.es ni dev.gastodehoy.es.

Teclado: Chromium, vía Playwright, con Tab y Enter de verdad en la página. No fue un teclado físico. El orden es el que devolvió `document.activeElement` después de cada Tab.

Anchura: la misma ventana, a 320×568 y a 390×844. No se usó un teléfono. Se midió si botones, campos, títulos e imágenes salían del ancho visible (`getBoundingClientRect` frente al `clientWidth`) y si el marco (`.gdh-app-frame` o `.gdh-dashboard-scroll`) tenía `scrollWidth` mayor que `clientWidth`.

Contraste: fórmula WCAG 2.x. En la pantalla Cuenta, el estilo computado coincidió con los tokens de `web/src/index.css`. Esos pares se calcularon con el color y el fondo opaco que pintaba el navegador. El botón primario y el aviso de instalar se calcularon desde los tokens, porque el fondo del aviso es un cian al 12 % y el botón no se muestreó como píxel.

Para entrar al panel se creó un usuario local. Al terminar, `POST /api/auth/me/delete` respondió 204, `/api/auth/me` respondió 401 y la tabla `users` de esa SQLite quedó a cero filas.

## Teclado

Portada, a 1280×900. Tab recorrió, y volvió al principio: el botón del logo («GastoDeHoy»), «Entrar» y «Crear cuenta» de la cabecera, «Empezar gratis», «Entrar» del hero, «Crear cuenta» y «Entrar» del cierre. Enter en «Empezar gratis» abrió el alta con la pestaña «Crear cuenta» seleccionada (`aria-selected=true`). No hubo trampa de foco.

Entrar. Tab recorrió: logo «Volver», el botón de texto «Volver», pestañas «Entrar» y «Crear cuenta», email (etiqueta «Email»), contraseña (etiqueta «Contraseña»), «Mostrar contraseña», «He olvidado mi contraseña». El envío no entró en el orden mientras estaba deshabilitado por campos vacíos. Enter en «Volver» volvió a la portada.

Crear cuenta. Tab recorrió las dos pestañas, email, «Tu nombre (lo verás en la cabecera)», contraseña y su «Mostrar contraseña», «Repite la contraseña» y el segundo «Mostrar contraseña», la casilla de la política, «política de privacidad», «condiciones de uso», la casilla de edad, y otra vez «Volver». Esas dos casillas tienen etiqueta. Los dos enlaces legales están dentro del `<label>` de la primera casilla; se tabulan aparte y tienen texto visible. No se comprobó si un clic de ratón en ellos también marca la casilla.

Hoy, con sesión. El primer Tab fue «Saltar al contenido principal». Después: Hoy, Gastos, Análisis, Histórico, Ingresos, Categorías, Metas, Guía, Cuenta, Exportar CSV, ES, EN, FR, DE, Cerrar sesión, «Añadir gasto», Política de Privacidad, Aviso Legal y el enlace `gastodehoy@gmail.com`. Enter en «Gastos» abrió el formulario.

Gasto del día. Los tres campos tienen etiqueta asociada, aunque la clase `sr-only` la deja en un recuadro de 1×1 px (posición absoluta). Tab: «Cantidad (€)», «Categoría», «Nota (opcional)», «Registrar», y a continuación el formulario de fijos («Elegir icono», «Concepto», «Importe (€)», «Añadir»). Se escribió 12,50 y «cafe» y Enter en «Registrar». El importe 12,50 € apareció en la lista.

Cuenta, en el lateral de escritorio. El tramo tabulado llegó a «Entendido», la casilla «Aviso diario» (el texto de la etiqueta es el nombre), la casilla «Vista compacta» y «Política de Privacidad». Esa pasada se cortó ahí: no se tabuló el cierre de sesión ni el botón de borrar la cuenta de esa misma sección. En el código, ambos tienen texto visible.

Menú a 390 px de ancho. Enter en «Menú» abrió el diálogo. Tab se quedó dentro y dio la vuelta: Ingresos, Categorías, Metas, Guía, Cuenta, Exportar CSV, ES, EN, FR, DE, Cerrar sesión, Cerrar, y otra vez Ingresos. Escape lo cerró.

El tour guiado no se tabuló. En el usuario de prueba estaba marcado como terminado. En `guided-tour.tsx` hay un listener de documento que, con el tour abierto, hace `preventDefault` del Enter y avanza el paso. Eso no se ejecutó en esta pasada.

## El arreglo

En Categorías, «Añadir categoría» abría dos campos con rótulo visible y sin vínculo: `el.labels` estaba vacío. El nombre solo podía salir del placeholder («Ej. Ocio» y «Ej. 80»). Se enlazó el rótulo con `htmlFor` / `id` en `web/src/components/dashboard/categories-section.tsx`. Después del cambio, el navegador asoció «Nombre» y «Presupuesto mensual (opcional)». Se escribió en ambos con el teclado. No se cambió el aspecto.

## Contraste

Pares leídos del estilo computado en Cuenta, texto normal salvo que se diga otra cosa. El mínimo AA de texto normal es 4,5:1.

| Texto | Fondo | Ratio |
| --- | --- | --- |
| `#eef4f9` a 20 px («Cuenta») | `#0e141a` | 16,71 |
| `#22d3ee` («Revision A11y») | `#0e141a` | 10,25 |
| `#b4c5d4` (párrafo de la cuenta) | `#0e141a` | 10,48 |
| `#b4c5d4` | `#0a0f14` | 10,88 |
| `#8fa3b3` a 11 px («PREFERENCIAS») | `#0e141a` | 7,11 |

Calculados desde los tokens, no desde un píxel del botón:

- Tinta `#04222a` sobre el cian `#22d3ee` del botón primario: 9,17:1.
- Cian `#22d3ee` sobre el aviso de instalar (cian al 12 % compuesto encima de `#0e141a`, fondo resultante `#102b33`): 8,21:1. El texto muted `#b4c5d4` en ese mismo fondo: 8,39:1.

El único par de token que baja de 4,5:1 es el chevron del swipe a opacidad 50 % (`text-[var(--color-text-dim)]/50` sobre `#0a0f14`): 2,68:1. Está marcado `aria-hidden`. No es el texto de un control.

## Anchura estrecha

En 320 y en 390, la portada, el entrar, el alta, Hoy, Gastos y Cuenta no sacaron botones, campos, títulos ni el logo fuera del ancho. El `scrollWidth` del marco coincidió con el `clientWidth` (320 y 390).

Portada a 320. Cabecera: logo 155×41, «Entrar» 74×44, «Crear cuenta» 119×44. El logo más los dos botones no caben en una sola fila; no se midió un desborde. «Empezar gratis» 288×44. Los botones del cierre, 238 px de ancho, dentro de la tarjeta.

Entrar a 320. Pestañas 139×44. «Mostrar contraseña» 44×46. El envío 246×44. «He olvidado mi contraseña» midió 246×16. En el alta, «política de privacidad» midió 121×16 y «condiciones de uso» 109×16.

Gastos. El campo «Cantidad (€)» midió 316×46 a 390 px (de x=37 a x=353) y 246×46 a 320 px (de x=37 a x=283). La barra inferior («Navegación principal») ocupó el ancho entero y 61 px de alto, pegada al borde de abajo (en 844 px de alto, de y=783 a y=844). El lateral de cuenta quedó a altura 0: por debajo de 768 px no se pinta.

Hoy y Gastos hacen scroll vertical. A 320×568, el marco de Gastos medía 889 px de contenido frente a 508 px visibles. No es un desborde horizontal.

## Ley 11/2023

La Ley 11/2023, de 8 de mayo, incorpora en su título I la Directiva (UE) 2019/882, el Acta Europea de Accesibilidad. El artículo 2 limita ese título a una lista de productos y de servicios (comunicaciones electrónicas, acceso a la comunicación audiovisual, ciertos elementos del transporte de viajeros, banca de consumo, libros electrónicos, comercio electrónico, sitios y apps de luz, agua y gas, sitios y apps de agencias de viajes, y redes sociales). GastoDeHoy es una app gratuita de presupuesto personal, de una persona, y todavía no tiene plan de pago. En esa lista no aparece un presupuesto personal. Nadie ha confirmado si el servicio entra en alguna de esas categorías.

El artículo 3.3 dice que las microempresas que presten servicios están exentas de los requisitos de accesibilidad del párrafo tercero del apartado 1 y de cualquier obligación relativa a esos requisitos. En las definiciones del título I, punto 16, microempresa es la empresa que emplea a menos de 10 personas y cuyo volumen de negocios anual no supera los 2 millones de euros, o cuyo balance anual total no supera los 2 millones de euros. Esta nota no fija una plantilla, una facturación ni un balance. Nadie ha confirmado que esa exención encaje aquí.

Esta nota no dice que la app cumpla la ley ni que quede fuera de ella.
