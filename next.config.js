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
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] }
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
