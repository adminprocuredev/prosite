// ** React Imports
import { forwardRef, useEffect, useState } from 'react'

// ** MUI Imports
import EngineeringIcon from '@mui/icons-material/Engineering'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material'
import Fade from '@mui/material/Fade'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Hooks Imports
import { sendEmailAssignDeliverable } from 'src/context/firebase-functions/mailing/sendEmailAssignDeliverable'
import { useFirebase } from 'src/context/useFirebase'

// ** Firebase Imports
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from 'src/configs/firebase'


const Transition = forwardRef(function Transition(props, ref) {
  return <Fade ref={ref} {...props} />
})

export const DialogCodeGenerator = ({ open, handleClose, doc }) => {
  //falta evaluar la foto del proyectista

  // ** States
  const [error, setError] = useState('')
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false)
  const [typeOfDiscipline, setTypeOfDiscipline] = useState('')
  const [typeOfDocument, setTypeOfDocument] = useState('')
  const [disciplines, setDisciplines] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [selectedDraftman, setSelectedDraftman] = useState(null)
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false)

  // ** Hooks
  const { fetchDisciplineProperties, fetchDeliverablesByDiscipline, generateBlueprintCodes, authUser } = useFirebase()

  useEffect(() => {

    const fetchData = async () => {

      const properties = await fetchDisciplineProperties()
      setDisciplines(Object.keys(properties))

    }

    fetchData()

  }, [])

  // Obtener usuarios con rol 5 (Planificador)
  const getPlannerData = async () => {
    // Realiza la consulta según el campo proporcionado
    const q = query(collection(db, 'users'), where('role', '==', 5))

    let plannerArray = []

    try {
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        console.log(`No se encontró ningún Planificador`)

        return null
      } else {
        const queryDocs = querySnapshot.docs
        queryDocs.forEach(doc => {
          plannerArray.push(doc.data())
        })

        return plannerArray
      }
    } catch (error) {
      console.log('Error al buscar Planificador: ', error)

      return null
    }
  }

  // Obtener usuarios con rol 6 (Administrador de Contrato)
  const getContractAdministratorData = async () => {
    // Realiza la consulta según el campo proporcionado
    const q = query(collection(db, 'users'), where('role', '==', 6))

    let contractAdministratorArray = []

    try {
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        console.log(`No se encontró ningún Administrador de Contrato`)

        return null
      } else {
        const queryDocs = querySnapshot.docs
        queryDocs.forEach(doc => {
          contractAdministratorArray.push(doc.data())
        })

        return contractAdministratorArray
      }
    } catch (error) {
      console.log('Error al buscar al Administrador de Contrato: ', error)

      return null
    }
  }

  // Función para obtener los usuarios que deben ir en copia en los e-mails de asignación del Entregable.
  const getUserEmailOnCopy = async () => {

    let usersOnCopy = []

    // Se obtienen los datos de C.Owner, petitioner y Planificador
    const usersData = await Promise.all([getPlannerData(), getContractAdministratorData()])
    const plannerData = usersData[0]
    const contractAdministratorData = usersData[1]

    // Se definen los emails de Planificador
    const plannerEmail = plannerData.filter(doc => doc.enabled != false).map(data => data.email)
    const contractAdministratorEmail = contractAdministratorData.filter(doc => doc.enabled != false).map(data => data.email)

    usersOnCopy.push(...plannerEmail, ...contractAdministratorEmail)

    return usersOnCopy

  }

  const handleChangeTypeOfDiscipline = async event => {
    setTypeOfDiscipline(event.target.value)
    const deliverables = await fetchDeliverablesByDiscipline(event.target.value)
    setDeliverables(Object.keys(deliverables))
  }

  const handleChangeTypeOfDocument = event => {
    setTypeOfDocument(event.target.value)
  }

  const handleQuantityChange = event => {
    const value = parseInt(event.target.value, 10) // Convertir el valor a entero
    if (value >= 1) {
      setQuantity(value) // Solo actualiza el estado si el valor es mayor o igual a 1
    }
  }

  const handleChangeDraftman = event => {
    const selected = doc.gabineteDraftmen.find(draftman => draftman.name === event.target.value)
    setSelectedDraftman(selected)
  }

  const handleOpenConfirmDialog = () => setOpenConfirmDialog(true)
  const handleCloseConfirmDialog = () => setOpenConfirmDialog(false)

  /**
   * Función onSubmit() que ejecuta:
   * - Creación de Códigos.
   * - Envío de e-mails a involucrados.
   * - Manejo de apertura y cierre de Dialog.
   * - Manejo de bloqueo y desbloqueo de Botones.
   * - Manejo de errores.
   */
  const onsubmit = async () => {

    if (typeOfDiscipline && typeOfDocument && quantity > 0) {

      // Se bloquea el botón "Crear código" mientras se ejecuta este onSubmit.
      setIsSubmitDisabled(true)

      try {
        // Obtener los códigos de los planos
        const mappedCodes = await fetchDeliverablesByDiscipline(typeOfDiscipline)
        const codes = await generateBlueprintCodes(mappedCodes[typeOfDocument], doc, quantity, selectedDraftman)

        // Cerrar el diálogo inmediatamente después de generar los códigos
        handleClose()

        // Obtener los usuarios que deben ir en copia
        const usersOnCopy = await getUserEmailOnCopy()

        // Enviar correos electrónicos para cada entregable
        for (let i = 0; i < quantity; i++) {
          try {
            await sendEmailAssignDeliverable(authUser, doc, selectedDraftman, codes[i], usersOnCopy)
          } catch (emailError) {
            console.error(`Error al enviar el correo para el código ${codes[i]}:`, emailError)
          }
        }
      } catch (error) {
        console.error(error)
        setError('Error al generar los códigos.')
      } finally {
        // Se desbloquea el botón "Crear código".
        setIsSubmitDisabled(false)
      }
    } else {
      setError('Por favor, indique tipo de disciplina, tipo de documento y cantidad.')
    }

  }


  const emptyFields = typeOfDiscipline.length === 0 || typeOfDocument.length === 0 || selectedDraftman === null

  return (
    <>
      <Dialog
        fullWidth
        open={open}
        maxWidth='xs'
        scroll='body'
        onClose={() => handleClose()}
        TransitionComponent={Transition}
        onBackdropClick={() => handleClose()}
      >
        <DialogContent sx={{ px: { xs: 8, sm: 15 }, py: { xs: 8, sm: 12.5 }, position: 'relative' }}>
          <IconButton
            size='small'
            onClick={() => handleClose()}
            sx={{ position: 'absolute', right: '1rem', top: '1rem' }}
          >
            <Icon icon='mdi:close' />
          </IconButton>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant='h5' sx={{ mb: 3, lineHeight: '2rem' }}>
              Generar nuevo documento
            </Typography>
          </Box>

          {isSubmitDisabled ? (
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              <CircularProgress /> <Typography sx={{ ml: 3 }}>Creando el código ID...</Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant='body2'>Establece parámetros para crear el código</Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', my: 5 }}>
                <FormControl fullWidth>
                  <InputLabel id='draftman-select-label'>Seleccionar Proyectista</InputLabel>
                  <Select
                    label='Seleccionar Proyectista'
                    labelId='draftman-select-label'
                    id='draftman-select'
                    value={selectedDraftman ? selectedDraftman.name : ''}
                    onChange={handleChangeDraftman}
                  >
                    {doc.gabineteDraftmen.map(draftman => (
                      <MenuItem key={draftman.userId} value={draftman.name}>
                        {draftman.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 5 }}>
                <FormControl fullWidth>
                  <InputLabel id='demo-select-small-label'>Tipo de disciplina</InputLabel>
                  <Select
                    label='Tipo de disciplina'
                    labelId='controlled-select-label'
                    id='controlled-select'
                    value={typeOfDiscipline}
                    onChange={handleChangeTypeOfDiscipline}
                  >
                    {disciplines
                      .sort((a, b) => a.localeCompare(b)) // Ordena alfabéticamente las disciplinas
                      .map((discipline, index) => (
                        <MenuItem key={index} value={discipline}>
                          {discipline}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 5 }}>
                <FormControl fullWidth>
                  <InputLabel id='demo-select-small-label'>Tipo de documento</InputLabel>
                  <Select
                    label='Tipo de documento'
                    id='controlled-select'
                    labelId='controlled-select-label'
                    value={typeOfDocument}
                    onChange={handleChangeTypeOfDocument}
                  >
                    {deliverables
                      .sort((a, b) => a.localeCompare(b)) // Ordena alfabéticamente los Tipo de documentos
                      .map((deliverable, index) => (
                        <MenuItem key={index} value={deliverable}>
                          {deliverable}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 5 }}>
                <TextField
                  label='Cantidad'
                  type='number'
                  value={quantity}
                  inputProps={{ min: 1 }}
                  onChange={handleQuantityChange}
                  fullWidth
                />
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                <Button
                  sx={{ lineHeight: '1.5rem', '& svg': { mr: 2 } }}
                  disabled={emptyFields}
                  onClick={handleOpenConfirmDialog}
                >
                  <EngineeringIcon sx={{ fontSize: 18 }} />
                  Crear código
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}

      <Dialog open={openConfirmDialog} onClose={handleCloseConfirmDialog} TransitionComponent={Transition}>
        <DialogContent>
          <Typography>
            ¿Está seguro que desea crear {quantity} Entregable
            {quantity > 1 ? 's' : ''} <br /> para ser asignado{quantity > 1 ? 's' : ''} a {selectedDraftman?.name}?{' '}
            <br />
            <br />- Tipo de Disciplina: {typeOfDiscipline} <br />- Tipo de Documento: {typeOfDocument}
          </Typography>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 3 }}>
          <Button color='error' onClick={handleCloseConfirmDialog} sx={{ mr: 2 }}>
            Regresar
          </Button>
          <Button
            variant='contained'
            onClick={() => {
              handleCloseConfirmDialog()
              onsubmit(doc.id)
            }}
          >
            Confirmar
          </Button>
        </Box>
      </Dialog>
    </>
  )
}
