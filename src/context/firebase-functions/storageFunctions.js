// ** Firebase Imports
import { db } from 'src/configs/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref, getDownloadURL, uploadBytes, getStorage } from 'firebase/storage'

const uploadFilesToFirebaseStorage = async (files, idSolicitud) => {
  const storage = getStorage()

  if (files && files.length > 0) {
    try {
      const arrayURL = []

      for (const file of files) {
        const storageRef = ref(storage, `fotosSolicitud/${idSolicitud}/fotos/${file.name}`)

        if (file) {
          // El formato de la cadena de datos es válido, puedes llamar a uploadString
          const snapshot = await uploadBytes(storageRef, file)
          console.log(snapshot, 'Uploaded a data_url string!')

          const downloadURL = await getDownloadURL(storageRef)

          arrayURL.push(downloadURL)
        } else {
          // El formato de la cadena de datos no es válido, muestra un mensaje de error o maneja la situación según sea necesario
          console.log('El objeto no tiene un formato de URL de datos válido.')
        }
      }

      const solicitudRef = doc(db, 'solicitudes', idSolicitud)
      const solicitudDoc = await getDoc(solicitudRef)

      if (solicitudDoc.exists()) {
        const fotos = arrayURL || []

        await updateDoc(solicitudRef, { fotos })
        console.log('URL de la foto actualizada exitosamente')
      } else {
        console.error('El documento de la solicitud no existe')
      }
    } catch (error) {
      console.error('Error al subir la imagen:', error)
    }
  }
}

// ** Actualiza Perfil de usuario
const updateUserProfile = async (inputValue, userParam) => {
  try {
    const user = userParam.uid
    const newPhoto = inputValue

    if (newPhoto !== null && newPhoto !== '') {
      const storageRef = ref(storage, `fotoPerfil/${user}/nuevaFoto`)

      try {
        await uploadString(storageRef, newPhoto, 'data_url')
        console.log('Uploaded a data_url string!')

        const downloadURL = await getDownloadURL(storageRef)

        // Actualizar el documento del usuario con la nueva URL de la foto
        await updateDoc(doc(db, 'users', user), { urlFoto: downloadURL })
        console.log('URL de la foto actualizada exitosamente')
      } catch (error) {
        console.error('Error al subir la imagen:', error)
      }
    } else {
      const storageRef = ref(storage, `fotoPerfil/${user}/nuevaFoto`)

      try {
        await uploadString(storageRef, newPhoto)
        console.log('Uploaded a data_url string!')

        // Actualizar el documento del usuario con la nueva URL de la foto
        await updateDoc(doc(db, 'users', user), { urlFoto: '' })
        console.log('URL de la foto eliminada exitosamente')
      } catch (error) {
        console.error('Error al subir la imagen:', error)
      }
    }
  } catch (error) {
    console.error('Error al actualizar el perfil de usuario:', error)
  }
}

export { uploadFilesToFirebaseStorage, updateUserProfile }