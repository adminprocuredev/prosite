// ** React Imports
import { useState } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** Context Imports
import { AbilityContext } from 'src/layouts/components/acl/Can'

// ** Config Import
import { buildAbilityFor } from 'src/configs/acl'

// ** Component Import
import NotAuthorized from 'src/pages/401'
import BlankLayout from 'src/@core/layouts/BlankLayout'

// ** Hooks
import { useFirebase } from 'src/context/useFirebase'

const AclGuard = props => {
  // ** Props
  const { aclAbilities, children, guestGuard } = props
  const [ability, setAbility] = useState(undefined)

  // ** Hooks
  const { authUser, loading } = useFirebase()
  const router = useRouter()

  // If guestGuard is true and user is not logged in or its an error page, render the page without checking access
  // '/nuevo-usuario' estaba en esta lista, o sea la pagina de creacion de
  // usuarios se saltaba la ACL entera: cualquier usuario con sesion la abria y
  // podia elegir rol 1 (administrador). La "contraseña de administrador" que
  // pide el formulario solo reautentica al que ya esta operando, nunca
  // comprueba que sea administrador. Ahora pasa por la ACL como el resto, que
  // la deja para el rol 1, igual que '/editar-usuarios'.
  if (
    guestGuard ||
    router.route === '/404' ||
    router.route === '/500' ||
    router.route === '/' ||
    router.route === '/completar-perfil'
  ) {
    return <>{children}</>
  }

  // User is logged in, build ability for the user based on his role
  if (authUser && authUser.role && !ability) {
    setAbility(buildAbilityFor(authUser.role, aclAbilities.subject))
  }

  // Check the access of current user and render pages
  if (ability && ability.can(aclAbilities.action, aclAbilities.subject)) {
    return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>
  }

  // Render Not Authorized component if the current user has limited access
  return (
    <BlankLayout>
      <NotAuthorized />
    </BlankLayout>
  )
}

export default AclGuard
