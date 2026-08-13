// Correr con: node src/@core/theme/palette/palette.test.mjs
//
// Este test existe por una sola razón: `customColors` vive dentro de la paleta
// de MUI pero sus valores NO son colores CSS —son ternas '234, 234, 255' para
// interpolar en `rgba(...)`—, y varios componentes de MUI recorren la paleta
// entera buscando entradas que parezcan un color:
//
//   Object.entries(theme.palette).filter(([, v]) => v.main && v.light)   // Switch, Alert
//   Object.entries(theme.palette).filter(([, v]) => v.main && v.dark)    // Alert
//
// A lo que pasa el filtro le aplican alpha() o getContrastText(), que exigen un
// color de verdad. Con una terna suelta lanzan y se cae la PÁGINA ENTERA.
//
// Ya pasó dos veces: primero con el Switch del panel de columnas del gabinete
// (Gabinete 10) y después, el 13-ago-2026, con el Alert de error de la portada
// en producción. Las dos veces el síntoma fue pantalla en blanco, no un
// componente mal pintado.
import assertOriginal from 'node:assert/strict'
import DefaultPalette from './index.js'

let comprobaciones = 0
const assert = new Proxy(assertOriginal, {
  get: (objetivo, propiedad) => (...args) => {
    comprobaciones++

    return objetivo[propiedad](...args)
  }
})

// Un color que MUI sabe leer. Es la misma familia de formatos que acepta
// alpha(): #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color().
const esColorCssDeVerdad = valor =>
  typeof valor === 'string' && (/^#([0-9a-f]{3,8})$/i.test(valor) || /^(rgb|rgba|hsl|hsla|color)\(/i.test(valor))

// El filtro exacto que corren Switch y Alert dentro de MUI.
const entradasQueMuiTomaPorColor = paleta =>
  Object.entries(paleta).filter(([, valor]) => valor && valor.main && (valor.light || valor.dark))

for (const modo of ['light', 'dark']) {
  for (const skin of ['default', 'bordered']) {
    const paleta = DefaultPalette(modo, skin)

    for (const [nombre, valor] of entradasQueMuiTomaPorColor(paleta)) {
      // Si una entrada pasa el filtro, sus tres colores tienen que ser colores
      // CSS reales, porque MUI se los va a pasar a alpha() y getContrastText().
      for (const clave of ['main', 'light', 'dark']) {
        if (valor[clave] === undefined) continue
        assert.ok(
          esColorCssDeVerdad(valor[clave]),
          `palette.${nombre}.${clave} = ${JSON.stringify(valor[clave])} en modo ${modo}/${skin}: ` +
            `MUI toma esta entrada por un color y le va a aplicar alpha()/getContrastText(). ` +
            `O el valor es un color CSS, o la entrada no puede llamarse "main".`
        )
      }
    }

    // Y el caso concreto que rompió dos veces: customColors NO puede tener
    // `main`, porque los cuatro filtros de MUI lo exigen. Sin esa clave no hay
    // filtro que pase, ni los de hoy ni los que agreguen mañana.
    assert.equal(
      paleta.customColors.main,
      undefined,
      `customColors.main volvió a existir en modo ${modo}/${skin}. Se llama mainRgb a propósito.`
    )

    // La terna sigue estando: el renombre no puede haberse llevado el valor.
    assert.ok(
      /^\d+, \d+, \d+$/.test(paleta.customColors.mainRgb),
      `customColors.mainRgb debe seguir siendo una terna para rgba(), y es ${JSON.stringify(paleta.customColors.mainRgb)}`
    )
  }
}

// La terna cambia con el modo: en claro es la oscura y al revés.
assert.equal(DefaultPalette('light', 'default').customColors.mainRgb, '76, 78, 100', 'modo claro usa lightColor')
assert.equal(DefaultPalette('dark', 'default').customColors.mainRgb, '234, 234, 255', 'modo oscuro usa darkColor')

// Y las entradas que SÍ son colores de verdad tienen que seguir pasando el
// filtro: si este test dejara la paleta sin ninguna, no estaría probando nada.
assert.ok(
  entradasQueMuiTomaPorColor(DefaultPalette('dark', 'default')).length >= 5,
  'primary, secondary, error, warning, info y success siguen siendo colores para MUI'
)

console.log(`ok — palette: ${comprobaciones} comprobaciones`)
