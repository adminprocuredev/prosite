// ** Firebase Imports
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { getDownloadURL, getStorage, ref, uploadBytes, uploadString } from 'firebase/storage'
import { db } from 'src/configs/firebase'

const uploadFilesToFirebaseStorage = async (files, idSolicitud, destination = 'solicitudes', petitionId = null) => {
  const storage = getStorage()

  try {
    const arrayURL = []

    if (destination === 'blueprints' || destination === 'hlcDocuments') {
      // Si el destination es "blueprints" o "hlcDocuments", solo hay un archivo en 'files'
      const file = files

      if (file) {
        const storageRef =
          destination === 'blueprints'
            ? ref(storage, `uploadedBlueprints/${idSolicitud}/blueprints/${file.name}`)
            : ref(storage, `uploadedHlcDocuments/${idSolicitud}/hlcDocuments/${file.name}`)

        // Sube el archivo al storage de Firebase
        const snapshot = await uploadBytes(storageRef, file)
        console.log(snapshot, 'Uploaded a data_url string!')

        // Obtén la URL de descarga
        const downloadURL = await getDownloadURL(storageRef)
        arrayURL.push(downloadURL)
      } else {
        console.error('El archivo no es válido o no existe.')
      }
    } else if (destination === 'solicitudes') {
      // Si el destination es "solicitudes", files es un array de archivos
      for (const file of files) {
        if (file) {
          const storageRef = ref(storage, `fotosSolicitud/${idSolicitud}/fotos/${file.name}`)

          // Sube cada archivo al storage de Firebase
          const snapshot = await uploadBytes(storageRef, file)
          console.log(snapshot, 'Uploaded a data_url string!')

          // Obtén la URL de descarga
          const downloadURL = await getDownloadURL(storageRef)
          arrayURL.push(downloadURL)
        } else {
          console.error('Uno de los archivos no es válido o no existe.')
        }
      }
    }

    const solicitudRef =
      destination === 'blueprints'
        ? doc(db, 'solicitudes', petitionId, 'blueprints', idSolicitud)
        : destination === 'hlcDocuments'
        ? doc(db, 'solicitudes', petitionId, 'blueprints', idSolicitud)
        : doc(db, 'solicitudes', idSolicitud)

    const solicitudDoc = await getDoc(solicitudRef)

    if (solicitudDoc.exists()) {
      // Actualizar el documento de la solicitud con las nuevas URL de las fotos SIN SOBREESCRIBIR
      // destination === 'blueprints'? await updateDoc(solicitudRef, { storageBlueprints: arrayUnion(...fotos) })
      // : destination === 'hlcDocuments'? await updateDoc(solicitudRef, { storageHlcDocuments: arrayUnion(...fotos) })
      // : await updateDoc(solicitudRef, { fotos })

      let arrayActual
      if (destination === 'blueprints') {
        arrayActual = solicitudDoc.data().storageBlueprints || []
      } else if (destination === 'hlcDocuments') {
        arrayActual = solicitudDoc.data().storageHlcDocuments || []
      } else if (destination === 'solicitudes') {
        arrayActual = solicitudDoc.data().fotos || []
      }

      // Reemplaza el array actual con las nuevas fotos (si hay fotos para subir)
      if (arrayURL.length > 0) {
        arrayActual = arrayURL
      }

      // Escribe el array modificado de vuelta en el documento
      if (destination === 'blueprints') {
        await updateDoc(solicitudRef, { storageBlueprints: arrayActual })
      } else if (destination === 'hlcDocuments') {
        await updateDoc(solicitudRef, { storageHlcDocuments: arrayActual })
      } else if (destination === 'solicitudes') {
        await updateDoc(solicitudRef, { fotos: arrayActual })
      }
      console.log('URL de la foto actualizada exitosamente')

      return arrayActual
    } else {
      console.error('El documento de la solicitud no existe')
    }
  } catch (error) {
    console.error('Error al subir la imagen:', error)
  }
}

// ** Actualiza Perfil de usuario
const updateUserProfile = async (inputValue, userParam) => {
  const storage = getStorage()
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
