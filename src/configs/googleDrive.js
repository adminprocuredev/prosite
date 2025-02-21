// const googleAuthConfig = {
//   CLIENT_ID: 'your-google-client-id',
//   CLIENT_SECRET: 'your-google-client-secret',
//   REDIRECT_URI: 'your-redirect-uri',
//   OAUTH2_ENDPOINT: 'https://accounts.google.com/o/oauth2/v2/auth',
//   TOKEN_ENDPOINT: 'https://oauth2.googleapis.com/token',
//   SCOPES: 'https://www.googleapis.com/auth/drive'
// }

// Configuración de autenticación de Google para Producción.
const googleAuthConfigProduction = {
  CLIENT_ID: process.env.NEXT_PUBLIC_PROD_GOOGLE_CLIENT_ID,
  CLIENT_SECRET: process.env.NEXT_PUBLIC_PROD_GOOGLE_CLIENT_SECRET,
  REDIRECT_URI: process.env.NEXT_PUBLIC_PROD_GOOGLE_REDIRECT_URI, // URL de producción
  MAIN_FOLDER_ID: process.env.NEXT_PUBLIC_PROD_DRIVE_FOLDER_ID, // ID de la carpeta principal de Drive
}

// Configuración de autenticación de Google para Desarrollo.
const googleAuthConfigDevelopment = {
  CLIENT_ID: process.env.NEXT_PUBLIC_DEV_GOOGLE_CLIENT_ID,
  CLIENT_SECRET: process.env.NEXT_PUBLIC_DEV_GOOGLE_CLIENT_SECRET,
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

console.log("Google Drive Folder ID: " + googleAuthConfig.MAIN_FOLDER_ID)

export default googleAuthConfig
