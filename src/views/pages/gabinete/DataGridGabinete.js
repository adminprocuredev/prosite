// ** React Imports
import { useState, useEffect } from 'react'

// ** Hooks
import { useFirebase } from 'src/context/useFirebase'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import {Chip} from '@mui/material'

// ** Custom Components Imports
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'

// ** Demo Components Imports
import TableGabinete from 'src/views/table/data-grid/TableGabinete'
import { DialogAssignDesigner } from 'src/@core/components/dialog-assignDesigner'
import { DialogCodeGenerator } from 'src/@core/components/dialog-codeGenerator'

const DataGridGabinete = () => {
  const [value, setValue] = useState('1')
  const [petition, setPetition] = useState('')
  const [roleData, setRoleData] = useState({ name: 'admin' })
  const [errors, setErrors] = useState({})
  const [open, setOpen] = useState(false)
  const [proyectistas, setProyectistas] = useState([])
  const [selectedPetition, setSelectedPetition] = useState('');
  const [blueprints, setBlueprints] = useState([]);
  const [openCodeGenerator, setOpenCodeGenerator] = useState(false)
  const [blueprintGenerated, setBlueprintGenerated] = useState(false);
  const [designerAssigned, setDesignerAssigned] = useState(false);

  const { useSnapshot, authUser, getRoleData, getUserData, getBlueprints, fetchPetitionById } = useFirebase()
  const data = useSnapshot(true, authUser)


  const handleClickOpenCodeGenerator = doc => {

    //setDoc(doc)
    setOpenCodeGenerator(true)
  }

  const handleCloseCodeGenerator = () => {
    setOpenCodeGenerator(false)
  }

  const handleClickOpen = doc => {
    //setDoc(doc)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleChangePetition = (event) => {
    const selectedOt = event.target.value;
    const selectedPetition = petitions.find(p => p.ot === selectedOt);
    setPetition(selectedPetition);
}

  const petitions =
    authUser.role === 1
      ? data.filter(doc => doc.state == 8)
      : authUser.role === 7 ?
      data.filter(doc => doc.state == 8 && doc.supervisorShift === authUser.shift[0])
      : data.filter(doc =>
        doc.state == 8 &&
        doc.designerReview &&  // Comprueba si designerReview existe antes de llamar a find
        doc.designerReview.find(designer => designer.userId === authUser.uid)
      )


  // Obtener el rol del usuario
  useEffect(() => {
    const fetchRoleAndProyectistas = async () => {
      if (authUser) {
        const role = await getRoleData(authUser.role.toString());
        setRoleData(role);

        // Cargar los proyectistas
        const resProyectistas = await getUserData('getUserProyectistas', null, authUser);
        setProyectistas(resProyectistas);
      }
    };

    fetchRoleAndProyectistas();
  }, [authUser]);

  // Obtener peticiones actualizadas y blueprints
  useEffect(() => {
    const fetchData = async () => {
      if (designerAssigned || blueprintGenerated) {
        const updatedPetition = await fetchPetitionById(petition.id);
        if (updatedPetition) {
          setPetition(updatedPetition);
          // Reset flags
          setDesignerAssigned(false);
          setBlueprintGenerated(false);
        }
      }
      if (petition) {
        const resBlueprints = await getBlueprints(petition.id);
        setBlueprints(resBlueprints);
      }
    };

    fetchData();
  }, [designerAssigned, blueprintGenerated, petition]);

  return (
    <Box sx={{ width: '100%', typography: 'body1' }}>
      <TabContext value={value}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <InputLabel id="demo-select-small-label">Ot</InputLabel>
            <Select
              value={selectedPetition.ot}
              label='Ot'
              id='controlled-select'
              onChange={handleChangePetition}
              labelId='controlled-select-label'
            >
              <MenuItem value=''>
                  <em>None</em>
              </MenuItem>
              {petitions.map((petitionItem, index) => (
                <MenuItem key={index} value={petitionItem.ot}>
                    Ot: {petitionItem.ot}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {authUser.role === 7 ?
            (<Button
            variant='contained'
            onClick={() => petition && handleClickOpen(petition)}
            >Asignar proyectista</Button>)
            : (<Button
            variant='contained'
            onClick={() => petition && handleClickOpenCodeGenerator(petition)}
            >Generar nuevo documento
          </Button>)}

          <TextField
          label='Proyectistas asignados'
          InputProps={{
            readOnly: true,
            startAdornment:
            petition && petition.designerReview && petition.designerReview.map((designer, index) => (
              <Chip
                  key={index}
                  label={designer.name}
              />
          ))

          }}
        />

          <TextField
            label='Título'
            value={petition ? petition.title : ''}
            id='form-props-read-only-input'
            InputProps={{ readOnly: true }}
          />
          <TextField
            label='Tipo de levantamiento'
            value={petition ? petition.objective : ''}
            id='form-props-read-only-input'
            InputProps={{ readOnly: true }}
          />
          <TextField
            label='Entregable'
            value={petition ? petition.deliverable.map(item => item) : ''}
            id='form-props-read-only-input'
            InputProps={{ readOnly: true }}
          />
        </Box>
        <Grid item xs={12}>
          <TabPanel value="1">
            <TableGabinete rows={blueprints ? blueprints : []} roleData={roleData} role={authUser.role} />
          </TabPanel>
        </Grid>
      </TabContext>
      <DialogAssignDesigner open={open} handleClose={handleClose} doc={petition} proyectistas={proyectistas} setDesignerAssigned={setDesignerAssigned} />
      {openCodeGenerator && <DialogCodeGenerator open={openCodeGenerator} handleClose={handleCloseCodeGenerator} doc={petition} roleData={roleData} setBlueprintGenerated={setBlueprintGenerated} />}
    </Box>
  )
}

export default DataGridGabinete
