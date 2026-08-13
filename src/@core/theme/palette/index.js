const DefaultPalette = (mode, skin) => {
  // ** Vars
  const whiteColor = '#FFF'
  const lightColor = '76, 78, 100' // rgb(76, 78, 100) / #4C4E64
  const darkColor = '234, 234, 255' // rgb(234, 234, 255) / #EAEAFF / rgba(0.9176, 0.9176, 1, A)
  const mainColor = mode === 'light' ? lightColor : darkColor

  const defaultBgColor = () => {
    if (skin === 'bordered' && mode === 'light') {
      return whiteColor
    } else if (skin === 'bordered' && mode === 'dark') {
      return '#484952'
    } else if (mode === 'light') {
      return '#F7F7F9'
    } else return '#2a2e36'
  }

  return {
    // NINGUNA CLAVE DE AQUÍ SE PUEDE LLAMAR `main`. Va en serio, y ya costó
    // dos caídas de página entera.
    //
    // Los valores de `customColors` no son colores CSS: son ternas sueltas
    // —'234, 234, 255'— pensadas para interpolarse dentro de `rgba(...)`. Pero
    // `customColors` vive dentro de la paleta, y varios componentes de MUI
    // recorren la paleta ENTERA buscando entradas que parezcan un color, con
    // este filtro:
    //
    //   Object.entries(theme.palette).filter(([, v]) => v.main && v.light)   // Switch, Alert (×2)
    //   Object.entries(theme.palette).filter(([, v]) => v.main && v.dark)    // Alert
    //
    // A lo que pasa el filtro le aplican `alpha()` o `getContrastText()`, y
    // esas funciones sí exigen un color CSS de verdad. Con una terna suelta
    // lanzan "Unsupported `234, 234, 255` color" y se lleva la página entera:
    // no es un componente feo, es pantalla en blanco.
    //
    // La primera vez se quitó `light`, y eso tapó el Switch y dos de las tres
    // variantes del Alert —el primero que apareció fue el Switch del panel de
    // columnas del gabinete, incidencia Gabinete 10—. La tercera, `main &&
    // dark`, quedó abierta y volvió a morder: el 13-ago-2026 la portada de
    // producción quedó en blanco al mostrar su Alert de error.
    //
    // Los cuatro filtros exigen `main`. Sin esa clave no hay filtro que pase,
    // ni estos ni los que MUI agregue después. Por eso se llama `mainRgb`: el
    // sufijo además avisa de qué son estos valores.
    customColors: {
      dark: darkColor,
      mainRgb: mainColor,
      darkBg: '#2a2e36',
      lightBg: '#F7F7F9',
      bodyBg: mode === 'light' ? '#F7F7F9' : '#2a2e36',
      trackBg: mode === 'light' ? '#F2F2F4' : '#41435C',
      tooltipBg: mode === 'light' ? '#262732' : '#464A65',
      tableHeaderBg: mode === 'light' ? '#F5F5F7' : '#3A3E5B'
    },
    mode: mode,
    common: {
      black: '#000',
      white: whiteColor
    },
    primary: {
      light: '#787EFF',
      main: '#666CFF',
      dark: '#5A5FE0',
      contrastText: whiteColor
    },
    secondary: {
      light: '#7F889B',
      main: '#6D788D',
      dark: '#606A7C',
      contrastText: whiteColor
    },
    error: {
      light: '#FF625F',
      main: '#FF4D49',
      dark: '#E04440',
      contrastText: whiteColor
    },
    warning: {
      light: '#FDBE42',
      main: '#FDB528',
      dark: '#DF9F23',
      contrastText: whiteColor
    },
    info: {
      light: '#40CDFA',
      main: '#26C6F9',
      dark: '#21AEDB',
      contrastText: whiteColor
    },
    success: {
      light: '#83E542',
      main: '#72E128',
      dark: '#64C623',
      contrastText: whiteColor
    },
    grey: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
      A100: '#F5F5F5',
      A200: '#EEEEEE',
      A400: '#BDBDBD',
      A700: '#616161'
    },
    text: {
      primary: `rgba(${mainColor}, 0.87)`,
      secondary: `rgba(${mainColor}, 0.6)`,
      disabled: `rgba(${mainColor}, 0.38)`
    },
    divider: `rgba(${mainColor}, 0.12)`,
    background: {
      paper: mode === 'light' ? whiteColor : '#484952',
      default: defaultBgColor()
    },
    action: {
      active: `rgba(${mainColor}, 0.54)`,
      hover: `rgba(${mainColor}, 0.05)`,
      hoverOpacity: 0.05,
      selected: `rgba(${mainColor}, 0.08)`,
      disabled: `rgba(${mainColor}, 0.26)`,
      disabledBackground: `rgba(${mainColor}, 0.12)`,
      focus: `rgba(${mainColor}, 0.12)`
    }
  }
}

export default DefaultPalette
