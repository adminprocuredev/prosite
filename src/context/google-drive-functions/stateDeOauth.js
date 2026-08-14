// El `state` del flujo OAuth de Google Drive.
//
// Es la defensa contra CSRF del flujo, y en Prosite estaba COMENTADO, con un
// valor de ejemplo: `// state: 'try_sample_request'`. Sin `state`, un tercero
// puede armar la URL de retorno con un `code` suyo y hacer que la víctima la
// abra; Prosite lo cambia por tokens sin más y la sesión de Drive del sitio
// queda apuntando a la cuenta del atacante. Todo lo que se suba después —los
// entregables— se va para allá.
//
// Vive aparte del hook para poder probarlo sin navegador ni Google.

// Un valor de ejemplo fijo no sirve de nada: tiene que ser impredecible y
// distinto en cada intento, o el atacante lo puede reproducir.
const LARGO_EN_BYTES = 16

export const LLAVE_DEL_STATE = 'oauth2-state'

/**
 * Genera un `state` nuevo.
 *
 * Usa el generador criptográfico del navegador. `Math.random()` no sirve aquí:
 * es predecible y esto existe justamente para que no se pueda adivinar.
 */
export const crearState = (crypto = globalThis.crypto) => {
  const bytes = new Uint8Array(LARGO_EN_BYTES)
  crypto.getRandomValues(bytes)

  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * ¿El `state` que volvió de Google es el que mandamos?
 *
 * Se comprueba por lo que SÍ tiene que cumplirse. Escrito al revés —descartando
 * los que no calzan— un par de nulos se cuela: si no guardamos nada y Google no
 * devuelve nada, `null === null` es true y el flujo seguiría con un `code` que
 * no pedimos. Por eso el guardado tiene que existir, además de coincidir.
 *
 * @param {string|null} guardado - El que dejamos en sessionStorage antes de salir.
 * @param {string|null} recibido - El que viene en la URL de retorno.
 */
export const stateCoincide = (guardado, recibido) =>
  typeof guardado === 'string' && guardado.length > 0 && guardado === recibido
