// ** React Imports
import { useEffect } from 'react'

// ** Next Imports
import { useRouter } from 'next/router'

// ** Spinner Import
import Spinner from 'src/@core/components/spinner'

// ** Hook Imports
import { useFirebase } from 'src/context/useFirebaseAuth'

export const getHomeRoute = (authUser) => {
  if (authUser){
  return '/home'
}

  return '/login'
}


const Home = () => {
  // ** Hooks
  const { authUser } = useFirebase()
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) {
      return
    }

      const homeRoute = getHomeRoute()

      // Redirect user to Home URL
      router.replace(homeRoute)
      console.log(authUser)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser])

  return <Spinner />
}

export default Home
