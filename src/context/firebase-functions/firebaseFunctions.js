// ** Firebase Imports
import { GoogleAuthProvider, deleteUser, getAuth, signInWithPopup } from 'firebase/auth'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { Firebase, app, db } from 'src/configs/firebase'

// ** Trae funcion que valida los campos del registro
import { registerValidator } from '../form-validation/helperRegisterValidator'
import { getData } from './firestoreQuerys'

// ** Auth object
const auth = getAuth()

const formatAuthUser = async user => {
  const data = await getData(user.uid)

  return {
    uid: user.uid,
    email: user.email,
    displayName: data ? data.name || 'No definido' : 'No disponible',
    urlFoto: data ? data.urlFoto || 'No definido' : 'No disponible',
    phone: data ? data.phone || 'No definido' : 'No disponible',
    role: data ? data.role || 'No definido' : 'No disponible',
    plant: data ? data.plant || 'No definido' : 'No disponible',
    engineering: data ? data.engineering || false : false,
    shift: data ? data.shift || 'No definido' : 'No disponible',
    company: data ? data.company || 'No definido' : 'No disponible',
    contop: data ? data.contop || 'No definido' : 'No disponible',
    opshift: data ? data.opshift || 'No definido' : 'No disponible',
    registered: data ? true : false,
    rut: data ? data.rut || 'No definido' : 'No disponible',
    completedProfile: data ? data.completedProfile || false : false
  }
}

// Recuperar password (envia cooreo)
const resetPassword = email => {
  return Firebase.auth()
    .sendPasswordResetEmail(email)
    .catch(err => {
      if (err.code === 'auth/user-not-found') {
        throw new Error('Este usuario no se encuentra registrado')
      } else {
        throw new Error('Error al restablecer la contraseña')
      }
    })
}

// Actualizar password (para actualizar desde mi perfil)
const updatePassword = async password => {
  return await Firebase.auth().updatePassword(password)
}

// ** Inicio de sesión
const signInWithEmailAndPassword = async (email, password, rememberMe) => {
  // Primero se crea una función asíncrona para logearse mediante Firebase que en caso de error retornará el error.
  const signIn = async () => {
    try {
      const userCredential = await Firebase.auth().signInWithEmailAndPassword(email, password)
      const userData = await formatAuthUser(userCredential.user)
      localStorage.setItem('user', JSON.stringify(userData))

      return userCredential
    } catch (err) {
      switch (err.code) {
        case 'auth/wrong-password':
          throw new Error('Contraseña incorrecta, intente de nuevo')
        case 'auth/user-not-found':
          throw new Error('Este usuario no se encuentra registrado')
        default:
          throw new Error('Error al iniciar sesión')
      }
    }
  }

  // Si el usuario seleccinó la casilla "Recordarme" se usa la versión por defecto de Firebase, la cual almacena al usuario.
  if (rememberMe) {

    return await signIn()

  } else {
    // En caso contrario, se define Persitencia 'sessión', lo que significa que el usuario permanecerá conectado mientras no cierre la pestaña del navegador
    await Firebase.auth().setPersistence('session')

    return await signIn()

  }
}

// ** Registro de usuarios
//
// Delega en la Cloud Function createUserAsAdmin (functions/index.js). Antes se
// creaba la cuenta aqui, con el SDK de CLIENTE: eso cambiaba la sesion a la del
// usuario recien creado, dejaba al administrador fuera de su propia cuenta, y
// el documento de 'users' se escribia despues, solo si el administrador lograba
// reautenticarse. Si eso fallaba quedaba una cuenta sin rol, imposible de usar
// y con el correo ya ocupado. Son las incidencias Gabinete 6 y Solicitudes 1.
//
// Ahora el servidor comprueba que quien llama sea administrador, crea la cuenta
// y escribe el documento; si lo segundo falla, borra la cuenta.
const createUser = async values => {
  const { email } = values
  try {
    registerValidator(values)

    const crearUsuario = httpsCallable(getFunctions(app), 'createUserAsAdmin')
    const { data } = await crearUsuario(values)

    // El correo para definir la contraseña se envia desde el cliente: no
    // necesita privilegios y reutiliza la funcion que ya existia.
    // Si el envio falla NO se reporta como fallo de creacion: el usuario ya
    // quedo creado en el servidor, y decir "error al crear usuario" llevaria a
    // reintentar y toparse con "el usuario ya se encuentra registrado".
    try {
      await resetPassword(email)
    } catch (errorCorreo) {
      console.error('Usuario creado, pero fallo el envio del correo:', errorCorreo)

      return { ...data, correoEnviado: false }
    }

    return { ...data, correoEnviado: true }
  } catch (error) {
    if (error.code === 'functions/already-exists') {
      throw new Error('El usuario ya se encuentra registrado.')
    }
    // `permission-denied` llega por DOS caminos que no tienen nada que ver:
    //
    // 1. La funcion nos rechazo -> viene con SU mensaje, el de abajo, escrito
    //    en index.js. Ahi si es un problema de quien esta llamando.
    // 2. Google corto la llamada ANTES de que la funcion existiera para el
    //    mundo, porque al desplegarla no se le pudo dejar `allUsers` como
    //    invocador. El cuerpo es una pagina HTML de error, el SDK no la
    //    entiende y deja el mensaje en 'permission-denied' o 'Forbidden'.
    //
    // Sin distinguirlas, el caso 2 le decia al administrador "solo un
    // administrador puede crear usuarios" -o sea, le echaba la culpa de un
    // permiso de infraestructura que no puede ver ni arreglar-.
    if (error.code === 'functions/permission-denied') {
      const RECHAZO_DE_LA_FUNCION = 'Solo un administrador habilitado puede crear usuarios.'
      if ((error.message || '').includes(RECHAZO_DE_LA_FUNCION)) {
        throw new Error('Solo un administrador habilitado puede crear usuarios.')
      }

      throw new Error(
        'La creación de usuarios está desplegada pero no habilitada: a la función createUserAsAdmin ' +
          'le falta el permiso de invocación en Google Cloud. Avisa a soporte; no es un problema de ' +
          'los datos que escribiste ni de tus permisos en Prosite.'
      )
    }

    // La funcion vive aparte del sitio: se despliega con firebase, no con
    // Vercel, asi que puede faltar en un ambiente donde el resto ya esta al
    // dia. Sin este caso el mensaje era "Error al crear usuario: internal",
    // que manda a buscar el problema en el formulario y no donde esta.
    if (error.code === 'functions/not-found') {
      throw new Error(
        'La creación de usuarios no está habilitada en este ambiente: falta desplegar la función createUserAsAdmin. ' +
          'Avisa a soporte; no es un problema de los datos que escribiste.'
      )
    }
    throw new Error('Error al crear usuario: ' + (error.message || error))
  }
}

// * Actualizar información del usuario:
const updateUserInDatabase = async (values, uid) => {

  // Actualizar email en Firestore
  await updateDoc(doc(db, 'users', uid), {
    name: values.name,
    firstName: values.firstName,
    fatherLastName: values.fatherLastName,
    motherLastName: values.motherLastName,
    rut: values.rut,
    phone: values.phone,
    plant: values.plant,
    role: values.role,
    enabled: values.enabled,
    company: values.company,
    shift: values.shift,
    subtype: values.subtype
  })


}

// Función que se ejecuta cuando el Administrador hace click en "Confirmar" dentro del Dialog de Confirmación para crear un usuario.
// values son los datos del usuario a crear {name, plant, rut, etc...}.
// password es la contraseña del Admin, la cual se necesita para reconectar luego de crear el usuario.
// oldEmail es el e-mail del Admin, el cual se necesita para reconectar luego de crear el usuario.
// uid es el UID del usuario que se está tratando de crear.
// signAdminBack y signAdminFailure se eliminaron junto con el flujo antiguo de
// creacion de usuarios. signAdminFailure hacia deleteUser(auth.currentUser)
// para revertir el alta: eso funcionaba solo porque la sesion quedaba en el
// usuario recien creado. Con la creacion en el servidor la sesion no cambia,
// asi que esa misma linea habria borrado la cuenta del ADMINISTRADOR.

const signGoogle = async () => {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({
    hd: 'procure.cl'
  })

  //Asks for permissions for the app to access the user's Drive files.
  provider.addScope('https://www.googleapis.com/auth/drive.file')
  provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly')
  provider.addScope('https://www.googleapis.com/auth/userinfo.email')
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile')

  signInWithPopup(auth, provider)
    // This gives you a Google Access Token. You can use it to access the Google API.
    // Uncomment the following lines to save the token in the local storage
    .then(result => {
      window.alert('Ingreso exitoso')
      let credential = GoogleAuthProvider.credentialFromResult(result)
      const token = credential.accessToken
      const params = { access_token: token }
      localStorage.setItem('oauth2-params', JSON.stringify(params))
    })
    .catch(error => {
      console.log(error)
    })
}

const deleteCurrentUser = async () => {
  const user = auth.currentUser
  deleteUser(user)
    .then(() => {
      // User deleted.
    })
    .catch(error => {
      console.error(error)
      // ...
    })
}

export {
  formatAuthUser,
  resetPassword,
  updatePassword,
  signInWithEmailAndPassword,
  createUser,
  signGoogle,
  deleteCurrentUser,
  updateUserInDatabase
}
