const path = require('path')

/** @type {import('next').NextConfig} */

const nextConfig = {
  transpilePackages: [
    '@fullcalendar/common',
    '@fullcalendar/react',
    '@fullcalendar/daygrid',
    '@fullcalendar/list',
    '@fullcalendar/timegrid'
  ],
  trailingSlash: true,
  reactStrictMode: false,

  // Saca los console.log del bundle de produccion. Hay 154 en el codigo, varios
  // volcando objetos completos en cada render, y dos de ellos imprimen los
  // tokens de OAuth de Google en la consola del navegador (useGoogle.js).
  // Se conservan error y warn, que sirven para diagnosticar.
  //
  // Y tambien info, que es donde viven las mediciones puestas a proposito
  // -«[solicitudes] foto de N filas en X ms», «[calendario] N de M en el
  // rango»-. Estaban escritas para diagnosticar PRODUCCION y en produccion no
  // existian: el compilador se las llevaba y en la consola de prosite.cl no
  // aparecia ninguna. Se perdio una tarde midiendo a ciegas por esto. La regla
  // queda asi: log es ruido y se va, info es instrumentacion y se queda.
  compiler: {
    removeConsole: { exclude: ['error', 'warn', 'info'] }
  },
  experimental: {
    esmExternals: false
  },
  webpack: config => {
    config.resolve.alias = {
      ...config.resolve.alias,
      apexcharts: path.resolve(__dirname, './node_modules/apexcharts-clevision')
    }

    return config
  }
}

module.exports = nextConfig
