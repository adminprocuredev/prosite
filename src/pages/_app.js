import FirebaseContextProvider from 'src/context/useFirebase'
import { LicenseInfo } from '@mui/x-license-pro'
import GoogleContextProvider from 'src/context/useGoogle'

// ** Next Imports
import Head from 'next/head';
import { Router } from 'next/router';

// ** Importar Error 405
import Error405 from '../pages/405';

// ** Loader Import
import NProgress from 'nprogress';

// ** Emotion Imports
import { CacheProvider } from '@emotion/react';

// ** Config Imports
import { defaultACLObj } from 'src/configs/acl';
import themeConfig from 'src/configs/themeConfig';

// ** Third Party Import
import { Toaster } from 'react-hot-toast';

// ** Component Imports
import AclGuard from 'src/@core/components/auth/AclGuard';
import AuthGuard from 'src/@core/components/auth/AuthGuard';
import GuestGuard from 'src/@core/components/auth/GuestGuard';
import WindowWrapper from 'src/@core/components/window-wrapper';
import ThemeComponent from 'src/@core/theme/ThemeComponent';
import UserLayout from 'src/layouts/UserLayout';

// ** Spinner Import
import Spinner from 'src/@core/components/spinner';

// ** Contexts
import { SettingsConsumer, SettingsProvider } from 'src/@core/context/settingsContext';

// ** Styled Components
import ReactHotToast from 'src/@core/styles/libs/react-hot-toast';

// ** Utils Imports
import { createEmotionCache } from 'src/@core/utils/create-emotion-cache';

// ** Importar Firebase
import { isUnderMaintenance } from '../configs/firebase';

// ** Prismjs Styles
import 'prismjs';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/themes/prism-tomorrow.css';

// ** React Perfect Scrollbar Style
import 'react-perfect-scrollbar/dist/css/styles.css';
import 'src/iconify-bundle/icons-bundle-react';

// ** Global css styles
import '../../styles/globals.css';

// Hola

// ** Set License Key for MUI X Premium
LicenseInfo.setLicenseKey(process.env.NEXT_PUBLIC_DEV_MUI_X_KEY);

const clientSideEmotionCache = createEmotionCache()

// ** Pace Loader
if (themeConfig.routingLoader) {
  Router.events.on('routeChangeStart', () => {
    NProgress.start()
  })
  Router.events.on('routeChangeError', () => {
    NProgress.done()
  })
  Router.events.on('routeChangeComplete', () => {
    NProgress.done()
  })
}

// Función que decide qué hacer:
// Si estás logueado, se usa authGuard; sino, se usa GuestGuard
const Guard = ({ children, authGuard, guestGuard, isUnderMaintenance }) => {

  if (isUnderMaintenance === 'true') {
    return <Error405 fallback={<Spinner />}>{children}</Error405>;
  } else {
    if (guestGuard) {
      return <GuestGuard fallback={<Spinner />}>{children}</GuestGuard>;
    } else if (!guestGuard && !authGuard) {
      return <>{children}</>;
    } else {
      return <AuthGuard fallback={<Spinner />}>{children}</AuthGuard>;
    }
  }
}

// ** Configure JSS & ClassName
const App = props => {

  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props

  // Variables
  const contentHeightFixed = Component.contentHeightFixed ?? false

  const getLayout =
    Component.getLayout ?? (page => <UserLayout contentHeightFixed={contentHeightFixed}>{page}</UserLayout>)
  const setConfig = Component.setConfig ?? undefined
  const authGuard = Component.authGuard ?? true
  const guestGuard = Component.guestGuard ?? false
  const aclAbilities = Component.acl ?? defaultACLObj
  const maintenanceMode = isUnderMaintenance

  return (
    <FirebaseContextProvider>
      <GoogleContextProvider>
        <CacheProvider value={emotionCache}>
          <Head>
            <title>{`${themeConfig.templateName} `}</title>
            <meta name='description' content={`${themeConfig.templateName}]`} />
            <meta name='keywords' content='Material Design, MUI, Admin Template, React Admin Template' />
            <meta name='viewport' content='initial-scale=1, width=device-width' />
          </Head>

          <SettingsProvider {...(setConfig ? { pageSettings: setConfig() } : {})}>
            <SettingsConsumer>
              {({ settings }) => {
                return (
                  <ThemeComponent settings={settings}>
                    <WindowWrapper>
                      <Guard authGuard={authGuard} guestGuard={guestGuard} isUnderMaintenance={maintenanceMode}>
                        <AclGuard aclAbilities={aclAbilities} guestGuard={guestGuard}>
                          {getLayout(<Component {...pageProps} />)}
                        </AclGuard>
                      </Guard>
                    </WindowWrapper>
                    <ReactHotToast>
                      <Toaster position={settings.toastPosition} toastOptions={{ className: 'react-hot-toast' }} />
                    </ReactHotToast>
                  </ThemeComponent>
                )
              }}
            </SettingsConsumer>
          </SettingsProvider>
        </CacheProvider>
      </GoogleContextProvider>
    </FirebaseContextProvider>
  )
}

export default App
