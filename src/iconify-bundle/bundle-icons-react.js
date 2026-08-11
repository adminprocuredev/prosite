/**
 * This is an advanced example for creating icon bundles for Iconify SVG Framework.
 *
 * It creates a bundle from:
 * - All SVG files in a directory.
 * - Custom JSON files.
 * - Iconify icon sets.
 * - SVG framework.
 *
 * This example uses Iconify Tools to import and clean up icons.
 * For Iconify Tools documentation visit https://docs.iconify.design/tools/tools2/
 */
import { promises as fs } from 'fs'
import { dirname } from 'path'

// Este archivo mezcla import de ESM con require.resolve, asi que Node lo carga
// como modulo ESM y `require` no existe: el script fallaba antes de generar
// nada. createRequire es el puente estandar para usar require dentro de ESM.
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Installation: npm install --save-dev @iconify/tools @iconify/utils @iconify/json @iconify/iconify
import { importDirectory, cleanupSVG, parseColors, isEmptyColor, runSVGO } from '@iconify/tools'
import { getIcons, stringToIcon, minifyIconSet } from '@iconify/utils'

/* eslint-enable */
const sources = {
  json: [
    // Iconify JSON file (@iconify/json is a package name, /json/ is directory where files are, then filename)
    // Antes esto traia mdi.json COMPLETO (unos 7.000 iconos, 2,9 MB) y la app
    // usa menos de cien. El bundle resultante viaja en _app, o sea lo descarga
    // hasta quien solo abre el login. Lista extraida de los nombres literales
    // presentes en src/, mas un margen de iconos de uso comun.
    {
      filename: require.resolve('@iconify/json/json/mdi.json'),
      icons: [
        'account-circle-outline',
        'account-group',
        'account-hard-hat',
        'account-outline',
        'alert',
        'alert-circle-outline',
        'arrow-down',
        'arrow-up',
        'bell-outline',
        'bookmark-outline',
        'briefcase-variant-outline',
        'calendar-month-outline',
        'cellphone',
        'cellphone-link',
        'chart-donut',
        'chart-pie',
        'check',
        'check-circle',
        'check-circle-outline',
        'checkbox-blank-outline',
        'checkbox-marked',
        'chevron-down',
        'chevron-left',
        'chevron-right',
        'chevron-up',
        'circle',
        'circle-medium',
        'circle-outline',
        'close',
        'close-circle-outline',
        'code-tags',
        'cog',
        'cog-outline',
        'content-copy',
        'content-save-outline',
        'crown-outline',
        'currency-usd',
        'delete-forever',
        'delete-outline',
        'dots-horizontal',
        'dots-vertical',
        'download',
        'download-outline',
        'email-outline',
        'export-variant',
        'eye-off-outline',
        'eye-outline',
        'facebook',
        'file-cad',
        'file-document-multiple-outline',
        'file-document-outline',
        'file-excel',
        'file-pdf',
        'file-word',
        'folder-multiple',
        'github',
        'google',
        'heart',
        'heart-outline',
        'home-outline',
        'hours-24',
        'information-outline',
        'language-javascript',
        'language-typescript',
        'laptop',
        'link-variant',
        'lock-outline',
        'logout-variant',
        'magnify',
        'map-outline',
        'menu',
        'message-outline',
        'minus',
        'monitor',
        'pencil-outline',
        'person-add-outline',
        'phone',
        'plus',
        'plus-circle-outline',
        'poll',
        'progress-upload',
        'rocket-launch-outline',
        'send',
        'server',
        'shield-account-outline',
        'shield-outline',
        'shopping-outline',
        'square-edit-outline',
        'star',
        'star-outline',
        'text-box-outline',
        'tooltip-edit-outline',
        'translate',
        'trending-up',
        'twitter',
        'view-grid-outline',
        'weather-night',
        'weather-sunny',
      ]
    },

    // Custom file with only few icons
    {
      filename: require.resolve('@iconify/json/json/line-md.json'),
      icons: ['home-twotone-alt', 'github', 'document-list', 'document-code', 'image-twotone']
    }

    // Custom JSON file
    // 'json/gg.json'
  ],
  icons: [
    'bx:basket',
    'bi:airplane-engines',
    'tabler:anchor',
    'uit:adobe-alt',
    'fa6-regular:comment',
    'twemoji:auto-rickshaw'
  ],
  svg: [
    {
      dir: 'src/iconify-bundle/svg',
      monotone: false,
      prefix: 'custom'
    }

    /* {
          dir: 'src/iconify-bundle/emojis',
          monotone: false,
          prefix: 'emoji'
        } */
  ]
}

// Iconify component (this changes import statement in generated file)
// Available options: '@iconify/react' for React, '@iconify/vue' for Vue 3, '@iconify/vue2' for Vue 2, '@iconify/svelte' for Svelte
const component = '@iconify/react'

// Set to true to use require() instead of import
const commonJS = false

// File to save bundle to
const target = 'src/iconify-bundle/icons-bundle-react.js'
;(async function () {
  let bundle = commonJS
    ? "const { addCollection } = require('" + component + "');\n\n"
    : "import { addCollection } from '" + component + "';\n\n"

  // Create directory for output if missing
  const dir = dirname(target)
  try {
    await fs.mkdir(dir, {
      recursive: true
    })
  } catch (err) {
    //
  }

  /**
   * Convert sources.icons to sources.json
   */
  if (sources.icons) {
    const sourcesJSON = sources.json ? sources.json : (sources.json = [])

    // Sort icons by prefix
    const organizedList = organizeIconsList(sources.icons)
    for (const prefix in organizedList) {
      const filename = require.resolve(`@iconify/json/json/${prefix}.json`)
      sourcesJSON.push({
        filename,
        icons: organizedList[prefix]
      })
    }
  }

  /**
   * Bundle JSON files
   */
  if (sources.json) {
    for (let i = 0; i < sources.json.length; i++) {
      const item = sources.json[i]

      // Load icon set
      const filename = typeof item === 'string' ? item : item.filename
      let content = JSON.parse(await fs.readFile(filename, 'utf8'))

      // Filter icons
      if (typeof item !== 'string' && item.icons?.length) {
        const filteredContent = getIcons(content, item.icons)
        if (!filteredContent) {
          throw new Error(`Cannot find required icons in ${filename}`)
        }
        content = filteredContent
      }

      // Remove metadata and add to bundle
      removeMetaData(content)
      minifyIconSet(content)
      bundle += 'addCollection(' + JSON.stringify(content) + ');\n'
      console.log(`Bundled icons from ${filename}`)
    }
  }

  /**
   * Custom SVG
   */
  if (sources.svg) {
    for (let i = 0; i < sources.svg.length; i++) {
      const source = sources.svg[i]

      // Import icons
      const iconSet = await importDirectory(source.dir, {
        prefix: source.prefix
      })

      // Validate, clean up, fix palette and optimise
      await iconSet.forEach(async (name, type) => {
        if (type !== 'icon') {
          return
        }

        // Get SVG instance for parsing
        const svg = iconSet.toSVG(name)
        if (!svg) {
          // Invalid icon
          iconSet.remove(name)

          return
        }

        // Clean up and optimise icons
        try {
          // Clean up icon code
          await cleanupSVG(svg)
          if (source.monotone) {
            // Replace color with currentColor, add if missing
            // If icon is not monotone, remove this code
            await parseColors(svg, {
              defaultColor: 'currentColor',
              callback: (attr, colorStr, color) => {
                return !color || isEmptyColor(color) ? colorStr : 'currentColor'
              }
            })
          }

          // Optimise
          await runSVGO(svg)
        } catch (err) {
          // Invalid icon
          console.error(`Error parsing ${name} from ${source.dir}:`, err)
          iconSet.remove(name)

          return
        }

        // Update icon from SVG instance
        iconSet.fromSVG(name, svg)
      })
      console.log(`Bundled ${iconSet.count()} icons from ${source.dir}`)

      // Export to JSON
      const content = iconSet.export()
      bundle += 'addCollection(' + JSON.stringify(content) + ');\n'
    }
  }

  // Save to file
  await fs.writeFile(target, bundle, 'utf8')
  console.log(`Saved ${target} (${bundle.length} bytes)`)
})().catch(err => {
  console.error(err)
})

/**
 * Remove metadata from icon set
 */
function removeMetaData(iconSet) {
  const props = ['info', 'chars', 'categories', 'themes', 'prefixes', 'suffixes']
  props.forEach(prop => {
    delete iconSet[prop]
  })
}

/**
 * Sort icon names by prefix
 */
function organizeIconsList(icons) {
  const sorted = Object.create(null)
  icons.forEach(icon => {
    const item = stringToIcon(icon)
    if (!item) {
      return
    }
    const prefix = item.prefix
    const prefixList = sorted[prefix] ? sorted[prefix] : (sorted[prefix] = [])
    const name = item.name
    if (prefixList.indexOf(name) === -1) {
      prefixList.push(name)
    }
  })

  return sorted
}
