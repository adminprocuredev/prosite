// El intercambio de tokens de Google, del lado del servidor.
//
// POR QUÉ EXISTE. `useGoogleDriveAuth.js` llamaba a `oauth2.googleapis.com`
// DESDE EL NAVEGADOR y le mandaba el `client_secret`. Con el prefijo
// `NEXT_PUBLIC_`, Next incrusta la variable en el JavaScript que sirve a
// cualquiera: el secreto de OAuth de Procure era extraíble de prosite.cl
// abriendo el bundle. Con él, un tercero puede pedir tokens a nombre de la
// aplicación.
//
// Next solo incrusta una `NEXT_PUBLIC_*` DONDE el código del cliente la
// menciona. Sacando esas dos menciones —aquí está el reemplazo— la variable
// deja de aparecer en el bundle, y este archivo, que corre en el servidor de
// Vercel, la sigue leyendo por `process.env` sin cambiar nada en Vercel. Por eso
// esto se puede desplegar hoy y no espera a nadie.
//
// LO QUE ESTO NO ARREGLA, y hay que decirlo: el secreto que está publicado
// desde hace meses sigue siendo válido hasta que se ROTE en la consola de
// Google. Este cambio corta la fuga; rotar cierra lo ya filtrado. Y al rotarlo
// conviene renombrar la variable a `GOOGLE_CLIENT_SECRET`, sin el prefijo, para
// que no pueda volver a colarse al navegador por descuido.
//
// ponytail: este endpoint no comprueba quién llama, igual que no lo comprobaba
// el navegador. Con un `refresh_token` robado alguien puede pedir un
// `access_token` aquí. Es estrictamente menos que hoy —hoy el secreto entero
// está publicado y sirve para eso y para más— pero no es el final del camino:
// el paso siguiente es exigir el ID token de Firebase del usuario y validarlo
// aquí con el Admin SDK, lo que pide credenciales de servicio en Vercel.

const PUNTO_DE_TOKEN = 'https://oauth2.googleapis.com/token'

// Las dos configuraciones conviven porque el sitio elige por hostname, igual que
// `configs/googleDrive.js`. Aquí no hay `window`, así que decide el `Host` de la
// petición.
//
// ponytail: el `Host` lo manda el cliente, así que en teoría se puede pedir la
// configuración de producción desde otro origen. Se mantiene igual a propósito:
// el `client_id` y el `redirect_uri` que usa el navegador SÍ salen del hostname
// (`configs/googleDrive.js`), y decidir aquí por otra vía —`VERCEL_ENV`, por
// ejemplo— desalinea las dos mitades y rompe el intercambio en cualquier
// despliegue de vista previa. Lo que se puede conseguir mintiendo en el `Host`
// es que Google rechace el intercambio, porque el `code` está atado al
// `client_id` y al `redirect_uri` con que se pidió; el secreto no sale de aquí
// en ningún caso. Si algún día las dos mitades se deciden en un solo lugar,
// este es el lugar.
const credenciales = host => {
  const esProduccion = host === 'www.prosite.cl' || host === 'procureterrenoweb.vercel.app'

  return esProduccion
    ? {
        clientId: process.env.NEXT_PUBLIC_PROD_GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.NEXT_PUBLIC_PROD_GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.NEXT_PUBLIC_PROD_GOOGLE_REDIRECT_URI
      }
    : {
        clientId: process.env.NEXT_PUBLIC_DEV_GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_DEV_CLIENT_SECRET || process.env.NEXT_PUBLIC_DEV_GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.NEXT_PUBLIC_DEV_GOOGLE_REDIRECT_URI
      }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')

    return res.status(405).json({ error: 'Solo POST' })
  }

  const { code, refresh_token: refreshToken } = req.body || {}

  if (!code && !refreshToken) {
    return res.status(400).json({ error: 'Falta el código de autorización o el token de refresco' })
  }

  const { clientId, clientSecret, redirectUri } = credenciales(req.headers.host)

  // Sin credenciales configuradas se responde explícito. La alternativa era
  // mandarle a Google un `client_secret` vacío y devolver su `invalid_client`,
  // que en la consola del navegador se lee como "Google rechazó al usuario" y
  // manda a buscar el problema al lado equivocado.
  if (!clientId || !clientSecret) {
    console.error('Faltan las credenciales de Google en el servidor: revisar las variables de entorno.')

    return res.status(500).json({ error: 'La integración con Google Drive no está configurada en el servidor' })
  }

  const cuerpo = new URLSearchParams(
    code
      ? { code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }
      : { refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' }
  )

  try {
    const respuesta = await fetch(PUNTO_DE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cuerpo.toString()
    })

    const datos = await respuesta.json()

    // Se devuelve lo que responde Google tal cual —incluido el error—, salvo el
    // estado: el cliente necesita distinguir "el código ya se usó" de "el
    // servidor está mal configurado".
    return res.status(respuesta.ok ? 200 : respuesta.status).json(datos)
  } catch (error) {
    console.error('Falló el intercambio de tokens con Google:', error)

    return res.status(502).json({ error: 'No se pudo contactar a Google' })
  }
}
