// ** Firebase Imports
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { getDownloadURL, getStorage, ref, uploadBytes, uploadString } from 'firebase/storage'
import { db } from 'src/configs/firebase'

const uploadFilesToFirebaseStorage = async (files, idSolicitud, destination = 'solicitudes', petitionId = null) => {
  const storage = getStorage()

  if (files && files.length > 0) {
    try {
      const arrayURL = []

      for (const file of files) {
        const storageRef =
          destination === 'blueprints'
            ? ref(storage, `uploadedBlueprints/${idSolicitud}/blueprints/${file.name}`)
            : destination === 'hlcDocuments'
            ? ref(storage, `uploadedHlcDocuments/${idSolicitud}/hlcDocuments/${file.name}`)
            : ref(storage, `fotosSolicitud/${idSolicitud}/fotos/${file.name}`)

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

      const solicitudRef =
        destination === 'blueprints'
          ? doc(db, 'solicitudes', petitionId, 'blueprints', idSolicitud)
          : destination === 'hlcDocuments'
          ? doc(db, 'solicitudes', petitionId, 'blueprints', idSolicitud)
          : doc(db, 'solicitudes', idSolicitud)

      const solicitudDoc = await getDoc(solicitudRef)

      if (solicitudDoc.exists()) {
        const fotos = arrayURL || []

        // Actualizar el documento de la solicitud con las nuevas URL de las fotos SIN SOBREESCRIBIR
        // destination === 'blueprints'? await updateDoc(solicitudRef, { storageBlueprints: arrayUnion(...fotos) })
        // : destination === 'hlcDocuments'? await updateDoc(solicitudRef, { storageHlcDocuments: arrayUnion(...fotos) })
        // : await updateDoc(solicitudRef, { fotos })

        let arrayActual
        if (destination === 'blueprints') {
          arrayActual = solicitudDoc.data().storageBlueprints
        } else if (destination === 'hlcDocuments') {
          arrayActual = solicitudDoc.data().storageHlcDocuments
        } else if (destination === 'solicitudes') {
          arrayActual = solicitudDoc.data().fotos
        }

        // Si el array actual no existe, inicialízalo como un array vacío
        if (!arrayActual) {
          arrayActual = []
        }

        // Si hay fotos para subir, reemplaza el array actual con las nuevas fotos
        if (fotos && fotos.length > 0) {
          arrayActual = fotos
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

        return fotos

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
