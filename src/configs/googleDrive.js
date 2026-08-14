// const googleAuthConfig = {
//   CLIENT_ID: 'your-google-client-id',
//   CLIENT_SECRET: 'your-google-client-secret',
//   REDIRECT_URI: 'your-redirect-uri',
//   OAUTH2_ENDPOINT: 'https://accounts.google.com/o/oauth2/v2/auth',
//   TOKEN_ENDPOINT: 'https://oauth2.googleapis.com/token',
//   SCOPES: 'https://www.googleapis.com/auth/drive'
// }

// OJO: aquí NO va el CLIENT_SECRET.
//
// Estaba, como `NEXT_PUBLIC_PROD_GOOGLE_CLIENT_SECRET`, y este archivo lo
// importa el navegador: Next incrusta las `NEXT_PUBLIC_*` en el bundle, así que
// el secreto de OAuth de Procure se podía leer abriendo el JavaScript de
// prosite.cl. El intercambio de tokens se mudó a `pages/api/google/token.js`,
// que corre en el servidor; el porqué completo está ahí.
//
// Si alguien lo vuelve a poner en este objeto, vuelve a publicarse.

// Configuración de autenticación de Google para Producción.
const googleAuthConfigProduction = {
  CLIENT_ID: process.env.NEXT_PUBLIC_PROD_GOOGLE_CLIENT_ID,
  REDIRECT_URI: process.env.NEXT_PUBLIC_PROD_GOOGLE_REDIRECT_URI, // URL de producción
  MAIN_FOLDER_ID: process.env.NEXT_PUBLIC_PROD_DRIVE_FOLDER_ID, // ID de la carpeta principal de Drive
}

// Configuración de autenticación de Google para Desarrollo.
const googleAuthConfigDevelopment = {
  CLIENT_ID: process.env.NEXT_PUBLIC_DEV_GOOGLE_CLIENT_ID,
  REDIRECT_URI: process.env.NEXT_PUBLIC_DEV_GOOGLE_REDIRECT_URI, // URL de desarrollo
  MAIN_FOLDER_ID: process.env.NEXT_PUBLIC_DEV_DRIVE_FOLDER_ID, // ID de la carpeta principal de Drive
}

// Selecciona la configuración de autenticación según el hostname
let googleAuthConfig

if (typeof window !== 'undefined') {
  if (window.location.hostname === 'www.prosite.cl' || window.location.hostname === 'procureterrenoweb.vercel.app') {
    googleAuthConfig = googleAuthConfigProduction
  } else {
    googleAuthConfig = googleAuthConfigDevelopment
  }
} else {
  googleAuthConfig = googleAuthConfigDevelopment
}

export default googleAuthConfig
