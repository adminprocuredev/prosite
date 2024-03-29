// ** React Imports
import { useState, forwardRef, useEffect } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Fade from '@mui/material/Fade'
import DialogContent from '@mui/material/DialogContent'
import EngineeringIcon from '@mui/icons-material/Engineering'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'


// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Hooks Imports
import { useFirebase } from 'src/context/useFirebase'

const Transition = forwardRef(function Transition(props, ref) {
  return <Fade ref={ref} {...props} />
})

export const DialogCodeGenerator = ({ open, handleClose, doc, setBlueprintGenerated }) => {
  //falta evaluar la foto del proyectista

  // ** States
  const [error, setError] = useState('')
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
  const [typeOfDiscipline, setTypeOfDiscipline] = useState('')
  const [typeOfDocument, setTypeOfDocument] = useState('')
  const [disciplines, setDisciplines] = useState([]);
  const [deliverables, setDeliverables] = useState([]);

  // ** Hooks
  const { updateDocs, authUser, generateBlueprint, fetchPlaneProperties } = useFirebase()

  const handleChangeTypeOfDiscipline = (event) => {
    setTypeOfDiscipline(event.target.value);
  }

  const handleChangeTypeOfDocument = (event) => {
    setTypeOfDocument(event.target.value);
  }



  const onsubmit = async id => {
    if (typeOfDiscipline && typeOfDocument) {
      setIsSubmitDisabled(true);
      await generateBlueprint(typeOfDiscipline, typeOfDocument, doc, authUser).then(() => {
        setBlueprintGenerated(true)
        handleClose();
        setIsSubmitDisabled(false);
      })
      .catch((error) => {
        console.error(error)
      })
    } else {
      setError('Por favor, indique tipo de disciplina y tipo de documento.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      let {resDeliverables,resDisciplines} = await fetchPlaneProperties()
      setDisciplines(resDisciplines)
      setDeliverables(resDeliverables)
    };

    fetchData();
  }, []);

  return (
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
          <Typography variant='body2'>Establece parámetros para crear el código</Typography>
        </Box>

        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 5 }}>
            <FormControl fullWidth sx={{ '& .MuiFormControl-root': { width: '100%' } }}>
              <InputLabel id="demo-select-small-label">Tipo de disciplina</InputLabel>
              <Select
                value={typeOfDiscipline}
                label='Tipo de disciplina'
                id='controlled-select'
                onChange={handleChangeTypeOfDiscipline}
                labelId='controlled-select-label'
              >
                <MenuItem value=''>
                    <em>None</em>
                </MenuItem>

                { Object.entries(disciplines).map(([key, value]) => (

                  <MenuItem key={key} value={value}>
                  <em>{`${value} - ${key}`}</em>
                  </MenuItem>
                  ))
                }


              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 5 }}>
            <FormControl fullWidth sx={{ '& .MuiFormControl-root': { width: '100%' } }}>
            <InputLabel id="demo-select-small-label">Tipo de documento</InputLabel>
              <Select
                value={typeOfDocument}
                label='Tipo de documento'
                id='controlled-select'
                onChange={handleChangeTypeOfDocument}
                labelId='controlled-select-label'
              >
                <MenuItem value=''>
                    <em>None</em>
                </MenuItem>
                { Object.entries(deliverables).map(([key, value]) => (

                  <MenuItem key={key} value={value}>
                  <em>{`${value} - ${key}`}</em>
                  </MenuItem>
                  ))
                  }

              </Select>
            </FormControl>
          </Box>
        </Box>


        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
          <Button
          sx={{ lineHeight: '1.5rem', '& svg': { mr: 2 } }}
          disabled={isSubmitDisabled} onClick={() => onsubmit(doc.id)}>
            <EngineeringIcon sx={{ fontSize: 18 }} />
            Crear código
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

