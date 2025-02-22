// ** Firebase Imports
import { GoogleAuthProvider, deleteUser, getAuth, signInWithPopup } from 'firebase/auth'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { Firebase, db } from 'src/configs/firebase'

// ** Trae funcion que valida los campos del registro
import { registerValidator } from '../form-validation/helperRegisterValidator'
import { getData } from './firestoreQuerys'

// ** Genera contraseña unica y aleatoria
const generatorPassword = require('generate-password')

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
const createUser = async (values, userParam, saveEmail, saveUID) => {
  const { name, email } = values
  try {
    registerValidator(values)

    // Guarda correo del admin
    saveEmail(userParam.email)

    // Crea contraseña alfanumerica de 10 digitos
    // Se comenta esta funcion para posterior uso en producción
    // const newPassword = generatorPassword.generate({
    //   length: 10,
    //   numbers: true
    // })
    const newPassword = 'password'

    // Crea usuario
    try {
      await Firebase.auth().createUserWithEmailAndPassword(email, newPassword) // Reemplazar 'password' por newPassword
    } catch (createError) {
      console.log('Error al crear el usuario:', createError)
      throw createError // Re-lanzar el error para que se pueda capturar en un nivel superior si es necesario
    }

    // Envía correo para cambiar la contraseña
    resetPassword(email)

    // Guardar uid en un estado
    saveUID(Firebase.auth().currentUser.uid)

    // Actualiza usuario
    // try {
    //   await updateProfile(Firebase.auth().currentUser, {
    //     displayName: name,
    //     photoURL: ''
    //   })
    //   console.log(Firebase.auth().currentUser)
    // } catch (updateError) {
    //   console.log('Error al actualizar el perfil:', updateError)
    //   throw updateError // Re-lanzar el error para que se pueda capturar en un nivel superior si es necesario
    // }
  } catch (error) {
    if (error.message === 'Firebase: Error (auth/email-already-in-use).') {
      throw new Error('El usuario ya se encuentra registrado.')
    } else {
      console.log('Error en datos ingresados:', error)
      throw new Error('Error al crear usuario: ' + error.message)
    }
  }
}

const createUserInDatabase = (values, uid) => {
  const { name, firstName, fatherLastName, motherLastName, rut, phone, email, plant, engineering, shift, company, role, opshift, subtype } = values

  // Lógica para calcular completedProfile
  let completedProfile = false
  if (company === 'Procure') {
    completedProfile = true
  } else if (company === 'MEL') {
    if (role === 2) {
      completedProfile = !!email && !!name && !!opshift && !!phone && !!plant && !!role && !!rut && !!shift
    } else if (role === 3 || role === 4) {
      completedProfile = !!email && !!name && !!phone && !!plant && !!role && !!rut
    } else {
      completedProfile = !!email && !!name && !!opshift && !!phone && !!plant && !!role && !!rut && !!shift
    }
  }

  console.log('completedProfile: ' + completedProfile)

  return new Promise(async (resolve, reject) => {
    try {
      await setDoc(doc(db, 'users', uid), {
        name: name,
        firstName: firstName,
        fatherLastName: fatherLastName,
        motherLastName: motherLastName,
        email: email,
        rut: rut,
        phone: phone.replace(/\s/g, ''),
        company: company,
        role: role,
        ...(plant && { plant }),
        ...(engineering && { engineering }),
        ...(shift && { shift }),
        ...(opshift && { opshift }),
        completedProfile: completedProfile,
        ...(subtype && {subtype}),
        enabled: true
      })

      resolve('Usuario creado exitosamente en la base de datos')
    } catch (error) {
      console.log(error)
      reject(new Error('Error al crear el usuario en la base de datos: ' + error))
    }
  })
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
const signAdminBack = async (values, password, oldEmail, uid) => {
  try {
    await Firebase.auth().signInWithEmailAndPassword(oldEmail, password)
    const successMessage = await createUserInDatabase(values, uid)

    // Realizar acciones adicionales si es necesario

    return successMessage // Retornar el mensaje de éxito
  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

async function signAdminFailure() {
  const user = auth.currentUser

  return new Promise(async (resolve, reject) => {
    try {
      await deleteUser(user)
      resolve('Excediste el número de intentos. No se creó ningún usuario.')
    } catch (error) {
      reject(new Error(error))
    }
  })
}

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
  createUserInDatabase,
  signAdminBack,
  signAdminFailure,
  signGoogle,
  deleteCurrentUser,
  updateUserInDatabase
}
