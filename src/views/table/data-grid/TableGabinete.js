import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { makeStyles } from '@mui/styles'
import { DataGridPremium, esES } from '@mui/x-data-grid-premium'
import { useEffect, useState } from 'react'

import { CancelOutlined, CheckCircleOutline, OpenInNew, Upload } from '@mui/icons-material'
import SyncIcon from '@mui/icons-material/Sync'
import { Container } from '@mui/system'

import KeyboardArrowDownSharpIcon from '@mui/icons-material/KeyboardArrowDownSharp'
import KeyboardArrowRightSharpIcon from '@mui/icons-material/KeyboardArrowRightSharp'
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Link,
  Select,
  Tooltip,
  Typography
} from '@mui/material'
import { UploadBlueprintsDialog } from 'src/@core/components/dialog-uploadBlueprints'
import AlertDialogGabinete from 'src/@core/components/dialog-warning-gabinete'
import { useFirebase } from 'src/context/useFirebase'

import { useGoogleDriveFolder } from 'src/context/google-drive-functions/useGoogleDriveFolder'

// TODO: Move to firebase-functions
import { getStorage, list, ref } from 'firebase/storage'


const TableGabinete = ({
  rows,
  role,
  roleData,
  petitionId,
  petition,
  apiRef,
  selectedRows,
  setSelectedRows,
  showReasignarSection
}) => {
  const [openUploadDialog, setOpenUploadDialog] = useState(false)
  const [openAlert, setOpenAlert] = useState(false)
  const [doc, setDoc] = useState({})
  const [proyectistas, setProyectistas] = useState([])
  const [loadingProyectistas, setLoadingProyectistas] = useState(true)
  const [approve, setApprove] = useState(true)
  const [currentRow, setCurrentRow] = useState(null)
  const [fileNames, setFileNames] = useState({})
  const [remarksState, setRemarksState] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [error, setError] = useState('')
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [buttonClicked, setButtonClicked] = useState(false)

  // Hooks.
  const { authUser, getUserData, getBlueprintPercent, getNextRevisionFolderName } = useFirebase()
  const { checkRoleAndApproval } = useGoogleDriveFolder()

  const defaultSortingModel = [{ field: 'date', sort: 'desc' }]

  const handleOpenUploadDialog = doc => {
    setCurrentRow(doc.id)
    setDoc(doc)
    setOpenUploadDialog(true)
    setOpenDialog(true)
  }

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false)
  }

  const handleClickOpenAlert = (doc, isApproved) => {
    setDoc(doc)
    setOpenAlert(true)
    setApprove(isApproved)
  }

  const handleSelectionChange = selection => {
    if (showReasignarSection || authUser.role === 9) {
      setSelectedRows(prevSelectedRows => {
        const newSelection = selection.map(id => rows.find(row => row.id === id))

        // Filtra duplicados y combina selecciones
        const combinedSelection = [
          ...prevSelectedRows.filter(row => selection.includes(row.id)),
          ...newSelection.filter(row => !prevSelectedRows.some(prevRow => prevRow.id === row.id))
        ]

        return combinedSelection
      })
    } else {
      // En modo selección única, permite solo una selección a la vez
      const selectedRow = rows.find(row => row.id === selection[0])
      setSelectedRows(selectedRow ? [selectedRow] : [])
    }
  }

  const handleCloseAlert = () => {
    setOpenAlert(false)
  }

  const theme = useTheme()
  const xs = useMediaQuery(theme.breakpoints.up('xs')) //0-600
  const sm = useMediaQuery(theme.breakpoints.up('sm')) //600-960
  const md = useMediaQuery(theme.breakpoints.up('md')) //960-1280
  const lg = useMediaQuery(theme.breakpoints.up('lg')) //1280-1920
  const xl = useMediaQuery(theme.breakpoints.up('xl')) //1920+

  const useStyles = makeStyles({
    root: {
      '& .MuiDataGrid-columnHeaderTitle': {
        fontSize: lg ? '0.8rem' : '1rem'
      }
    }
  })

  const classes = useStyles()

  const storage = getStorage()

  const getBlueprintName = async id => {
    const blueprintRef = ref(storage, `/uploadedBlueprints/${id}/blueprints`)
    try {
      const res = await list(blueprintRef)

      return res?.items[0]?.name || 'No disponible'
    } catch (err) {
      console.error(err)

      return 'Error al obtener el nombre del entregable'
    }
  }


  /**
   * Función que define si el usuario conectado puede ver o no los botones para Aprobar o Rechazar
   * @param {Object} row - Información del Entregable.
   * @param {Object} authUser - Información del Usuario conectado que realiza la acción.
   * @returns {Object|undefined} - Retorna un Objeto con booleanos o Undefined en caso de errores.
   */
  function permissions(row, authUser) {

    if (!row) {
      return undefined
    }

    // Desestructuración de Objetos.
    const {
      userId,
      description,
      clientCode,
      storageBlueprints,
      approvedByContractAdmin,
      approvedByDocumentaryControl,
      approvedBySupervisor,
      blueprintCompleted,
      attentive
    } = row

    const { uid, role } = authUser

    // Definición de variables booleanas.
    const isRole6Turn = attentive === 6
    const isRole7Turn = attentive === 7
    const isRole8Turn = attentive === 8
    const isRole9Turn = attentive === 9
    const isMyBlueprint = userId === uid
    const hasRequiredFields = description && clientCode && storageBlueprints && storageBlueprints.length >= 1

    const dictionary = {
      6: {
        approve: isRole6Turn && !approvedByContractAdmin,
        reject: isRole6Turn && !approvedByContractAdmin
      },
      7: {
        approve: (isRole7Turn && !isMyBlueprint && !approvedBySupervisor) || (isRole7Turn && isMyBlueprint && hasRequiredFields && !blueprintCompleted),
        reject: isRole7Turn  && !isMyBlueprint && !approvedBySupervisor
      },
      8: {
        approve: isRole8Turn && isMyBlueprint && hasRequiredFields && !blueprintCompleted,
        reject: false
      },
      9: {
        approve: isRole9Turn && !approvedByDocumentaryControl,
        reject: isRole9Turn && !approvedByDocumentaryControl
      }
    }

    return dictionary[role]
  }


  /**
   * Función para renderizar el string del Estado que aparecerá en la columna "Observaciones".
   * @param {Object} row - Datos del Entregable (blueprint).
   * @returns {string} - Estado que aparecerá en la columna "Observaciones"
   */
  const renderStatus = row => {

    // Desestructuración de blueprint(row)
    const {
      revision,
      sentTime,
      blueprintCompleted,
      attentive,
      sentByDesigner,
      sentBySupervisor,
      approvedBySupervisor,
      approvedByContractAdmin,
      approvedByDocumentaryControl,
      sentToClient,
      checkedByClient,
      resumeBlueprint,
      approvedByClient,
      remarks
    } = row

    // Booleanos
    const isInitialRevision = revision === "Iniciado"
    const isRevA = revision === "A"
    const isRevisionAtLeastB = !isInitialRevision && !isRevA
    const beingReviewedByClient = attentive === 4
    const sentByAuthor = sentByDesigner || sentBySupervisor

    const statusChecks = [
      {
        status: "Iniciado",
        check: !sentTime
      },
      {
        status: "Entregable Terminado",
        check: blueprintCompleted
      },
      {
        status: "Enviado a siguiente Revisor",
        check: !beingReviewedByClient && (sentByAuthor || (sentByDesigner && (approvedByContractAdmin || approvedBySupervisor)))
      },
      {
        status: "Enviado a Cliente",
        check: sentToClient
      },
      {
        status: "Reanudado",
        check: resumeBlueprint && !approvedByClient && !sentByDesigner
      },
      {
        status: "Aprobado con comentarios por Cliente ",
        check: approvedByClient && remarks
      },
      {
        status: "Aprobado sin comentarios por Cliente ",
        check: approvedByClient && !remarks && !blueprintCompleted
      },
      {
        status: "Aprobado por Control Documental",
        check: approvedByDocumentaryControl && !sentByDesigner && isRevA && !remarks
      },
      {
        status: "Aprobado con comentarios por Control Documental",
        check: approvedByDocumentaryControl && !sentByDesigner && isRevA && remarks
      },
      {
        status: "Generar Transmittal",
        check: beingReviewedByClient && approvedByDocumentaryControl
      },
      {
        status: "Rechazado por Cliente",
        check: checkedByClient && !approvedByClient
      },
      {
        status: "Con Observaciones y Comentarios",
        check: !blueprintCompleted && (
          (!sentByDesigner && (!approvedByDocumentaryControl || approvedByContractAdmin || approvedBySupervisor)) ||
          (!sentByDesigner && approvedByDocumentaryControl && !approvedByClient && remarks) ||
          (approvedByDocumentaryControl &&
          !sentByDesigner && isRevisionAtLeastB))
      }
    ]

    const result = statusChecks.find(({ check }) => check)

    return result ? result.status : 'Aprobado1'

  }

  const renderButton = (row, approve, color, IconComponent, disabled, resume = false) => {
    const handleClick = () => handleClickOpenAlert(row, approve)

    return (
      <Button
        onClick={handleClick}
        variant='contained'
        disabled={disabled || buttonClicked}
        color={color}
        sx={{
          padding: '0rem!important',
          margin: '0.15rem!important',
          maxWidth: '25px',
          maxHeight: '25px',
          minWidth: resume && !lg ? '120px' : resume ? '80px' : '40px',
          minHeight: '25px'
        }}
      >
        <IconComponent sx={{ fontSize: 18, fontSize: lg ? '0.8rem' : '1rem' }} />
        {resume ? (
          <Typography sx={{ textOverflow: 'clip', fontSize: lg ? '0.7rem' : '1rem' }}> Reanudar</Typography>
        ) : (
          ''
        )}
      </Button>
    )
  }

  const renderButtons = (row, flexDirection, canApprove, canReject, disabled, canResume = false) => {

    return (
      <Container
        sx={{ display: 'flex', flexDirection: { flexDirection }, padding: '0rem!important', margin: '0rem!important' }}
      >
        {canApprove && renderButton(row, true, 'success', CheckCircleOutline)}
        {canReject && renderButton(row, false, 'error', CancelOutlined)}
        {canResume && renderButton(row, true, 'info', SyncIcon, disabled, true)}
      </Container>
    )

  }


  /**
   * Función para ¿?
   * @param {number} role - Rol del usuario conectado que realiza la acción.
   * @param {Object} blueprint - Información del Entregable.
   * @returns {boolean}
   */
  const checkRoleAndGenerateTransmittal = (role, blueprint) => {

    // Desestructuración de blueprint.
    const { revisions, revision, lastTransmittal, approvedByDocumentaryControl, sentByDesigner, sentBySupervisor, blueprintCompleted } = blueprint

    // Booleanos
    const isRole9 = role === 9
    const sentByAuthor = sentByDesigner || sentBySupervisor
    const isInitialRevision = revision === "Iniciado"
    const isRevA = revision === "A"
    const isRevisionAtLeastB = !isInitialRevision && !isRevA

    if (revisions && revisions.length > 0) {

      const sortedRevisions = [...revisions].sort((a, b) => new Date(b.date) - new Date(a.date))
      const lastRevision = sortedRevisions[0]

      // Caso 1: 'row' no tiene 'lastTransmittal' y se cumplen las demás condiciones
      if (
        !lastTransmittal && isRole9 && approvedByDocumentaryControl && sentByAuthor &&
        isRevisionAtLeastB && !blueprintCompleted
      ) {
        return true
      }

      // Caso 2: 'lastRevision' no tiene 'lastTransmittal' y se cumplen las demás condiciones
      if (
        !('lastTransmittal' in lastRevision) && isRole9 && approvedByDocumentaryControl && sentByAuthor &&
        isRevisionAtLeastB && !blueprintCompleted
      ) {
        return true
      }
    }

    return false
  }

  const checkRoleAndResume = (role, blueprint) => {

    // Desestructuración de bluepint
    const { revision, approvedByClient, blueprintCompleted } = blueprint

    // Booleanos
    const isNumeric = !isNaN(revision)

    return (
      role === 9 && approvedByClient && isNumeric && blueprintCompleted
    )
  }

  useEffect(() => {
    // Primera parte: obtener los nombres de los planos
    rows.map(async row => {
      const blueprintName = await getBlueprintName(row.id)
      setFileNames(prevNames => ({ ...prevNames, [row.id]: blueprintName }))
    })

    // Segunda parte: manejar la apertura del diálogo de carga
    if (openUploadDialog) {
      const filterRow = rows.find(rows => rows.id === currentRow)
      setDoc(filterRow)
      setOpenUploadDialog(true)
    }
  }, [rows, openUploadDialog, currentRow])

  useEffect(() => {
    const fetchProyectistas = async () => {
      const resProyectistas = await getUserData('getUserProyectistas', null, authUser)
      setProyectistas(resProyectistas)
      setLoadingProyectistas(false)
    }

    fetchProyectistas()
  }, [authUser.shift])

  useEffect(() => {
    // Sincroniza el estado de selección del DataGrid con selectedRows
    const selectedIds = selectedRows.map(row => row.id)

    // Evita actualizar si no hay cambios en la selección
    if (apiRef.current.getSelectedRows().size !== selectedIds.length) {
      apiRef.current.setRowSelectionModel(selectedIds)
    }
  }, [selectedRows, apiRef])

  // Filtra las filas eliminadas
  const filterDeletedRows = rows => {
    return rows.filter(row => !row.deleted)
  }

  const transformDataForGrouping = rows => {
    return rows
      .map(item => {
        // Transforma las revisiones en subfilas
        const revisionsTransformed = item.revisions.map((rev, index) => ({
          ...rev,
          id: `${item.id}-rev-${index}`, // ID único para cada revisión
          parentId: item.id, // ID de la fila principal
          isRevision: true // Marca las revisiones para renderizado especial
        }))

        return [item, ...revisionsTransformed] // Combina fila principal con sus revisiones
      })
      .flat()
  }

  // Filtra y transforma las filas en una sola operación
  const filteredAndTransformedRows = filterDeletedRows(rows)
  const transformedRows = transformDataForGrouping(filteredAndTransformedRows)

  const filteredRows = transformedRows.filter(row => {
    return !row.isRevision || expandedRows.has(row.parentId)
  })

  const handleToggleRow = rowId => {
    setExpandedRows(prevExpandedRows => {
      const newExpandedRows = new Set(prevExpandedRows)
      if (newExpandedRows.has(rowId)) {
        newExpandedRows.delete(rowId)
      } else {
        newExpandedRows.add(rowId)
      }

      return newExpandedRows
    })
  }

  const roleMap = {
    "Cliente": row => row.attentive === 4,
    "Administrador de Contrato": row => row.attentive === 6,
    "Supervisor": row => row.attentive === 7,
    "Proyectista": row => row.attentive === 8,
    "Control Documental": row => row.attentive === 9,
    "Finalizado": row => row.attentive === 10
  }

  const renderRole = row => {
    for (const role in roleMap) {
      if (roleMap[role](row)) {
        return role
      }
    }
  }

  const idLocalWidth = Number(localStorage.getItem('idGabineteWidthColumn'))
  const revisionLocalWidth = Number(localStorage.getItem('revisionGabineteWidthColumn'))
  const nextRevisionLocalWidth = Number(localStorage.getItem('nextRevisionGabineteWidthColumn'))
  const percentLocalWidth = Number(localStorage.getItem('percentGabineteWidthColumn'))
  const userNameLocalWidth = Number(localStorage.getItem('userNameGabineteWidthColumn'))
  const lastTransmittalLocalWidth = Number(localStorage.getItem('lastTransmittalGabineteWidthColumn'))
  const descriptionLocalWidth = Number(localStorage.getItem('descriptionGabineteWidthColumn'))
  const filesLocalWidth = Number(localStorage.getItem('filesGabineteWidthColumn'))
  const hlcLocalWidth = Number(localStorage.getItem('hlcGabineteWidthColumn'))
  const dateLocalWidth = Number(localStorage.getItem('dateGabineteWidthColumn'))
  const remarksLocalWidth = Number(localStorage.getItem('remarksGabineteWidthColumn'))
  const clientLocalWidth = Number(localStorage.getItem('clientGabineteWidthColumn'))

  const columns = [
    {
      field: 'id',
      width: idLocalWidth ? idLocalWidth : role === 9 && !lg ? 355 : role !== 9 && !lg ? 360 : role !== 9 ? 300 : 300,
      headerName: 'Código Procure / MEL',

      renderCell: params => {
        const { row } = params

        localStorage.setItem('idGabineteWidthColumn', params.colDef.computedWidth)

        const isGroupedRow = !params.row.treeDataGroupingField

        const isExpanded = expandedRows.has(params.row.id)

        const toggleIcon = isGroupedRow ? (
          isExpanded ? (
            <KeyboardArrowDownSharpIcon onClick={() => handleToggleRow(params.row.id)} />
          ) : (
            <KeyboardArrowRightSharpIcon onClick={() => handleToggleRow(params.row.id)} />
          )
        ) : (
          false
        )
        if (row.isRevision && expandedRows.has(params.row.parentId)) {
          return ''
        } else if (!row.isRevision && !expandedRows.has(params.row.parentId)) {
          return (
            <>
              <Tooltip
                title={row.id}
                placement='bottom-end'
                key={row.id}
                leaveTouchDelay={0}
                TransitionProps={{ timeout: 0 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', overflow: 'hidden', width: 'inherit' }}>
                  {toggleIcon}
                  <IconButton
                    sx={{ p: 0, mr: 2 }}
                    color={row.storageBlueprints?.length > 0 && !row.description ? 'error' : 'secondary'}
                    id={row.id}
                    onClick={() => {
                      handleOpenUploadDialog(row)
                    }}
                  >
                    <OpenInNew sx={{ fontSize: lg ? '1rem' : '1.2rem' }} />
                  </IconButton>

                  <Box>
                    <Typography
                      noWrap
                      sx={{
                        textOverflow: 'clip',
                        fontSize: lg ? '0.8rem' : '1rem',
                        textDecoration: 'none',
                        transition: 'text-decoration 0.2s',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      {row.id || 'Sin código Procure'}
                    </Typography>
                    <Typography variant='caption' sx={{ fontSize: lg ? '0.6rem' : '0.8rem' }}>
                      {row.clientCode || 'Sin código MEL'}
                    </Typography>
                    {row.id === currentRow && row.revisions.length === 0 && (
                      <Typography sx={{ mt: 1, fontSize: lg ? '0.8rem' : '1rem' }}>Sin eventos en historial</Typography>
                    )}
                  </Box>
                </Box>
              </Tooltip>
            </>
          )
        }
      }
    },
    {
      field: 'revision',
      headerName: 'REVISION',
      width: revisionLocalWidth
        ? revisionLocalWidth
        : role === 9 && !lg
        ? 95
        : role !== 9 && !lg
        ? 95
        : role !== 9
        ? 80
        : 80,
      renderCell: params => {
        const { row } = params

        localStorage.setItem('revisionGabineteWidthColumn', params.colDef.computedWidth)

        let revisionContent

        if (row.isRevision && expandedRows.has(params.row.parentId)) {
          // Para las filas de revisión, muestra el registro de la revisión a modo de historial
          revisionContent = row.newRevision

          return (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                {revisionContent || 'N/A'}
              </Typography>
            </Box>
          )
        } else if (!row.isRevision && !expandedRows.has(params.row.parentId)) {
          // Para las filas principales, muestra la el estado de la revisión actual
          revisionContent = row.revision

          return (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                {revisionContent || 'N/A'}
              </Typography>
            </Box>
          )
        }
      }
    },
    {
      field: 'nextRevision',
      headerName: 'REVISION SIGUIENTE',
      width: nextRevisionLocalWidth
        ? nextRevisionLocalWidth
        : role === 9 && !lg
        ? 95
        : role !== 9 && !lg
        ? 95
        : role !== 9
        ? 80
        : 80,
      renderCell: params => {
        const { row } = params

        localStorage.setItem('nextRevisionGabineteWidthColumn', params.colDef.computedWidth)

        let revisionContent

        if (row.isRevision && expandedRows.has(params.row.parentId)) {
          // Para las filas de revisión, muestra el registro de la revisión a modo de historial
          revisionContent = row.newRevision

          return (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                {''}
              </Typography>
            </Box>
          )
        } else if (!row.isRevision && !expandedRows.has(params.row.parentId)) {
          // Para las filas principales, muestra la el estado de la revisión actual
          revisionContent = row.revision

          let nextRevision = row && getNextRevisionFolderName(row)

          return (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                {nextRevision || 'N/A'}
              </Typography>
            </Box>
          )
        }
      }
    },
    {
      field: 'percent',
      headerName: 'PORCENTAJE',
      width: percentLocalWidth ? percentLocalWidth : role === 9 && !lg ? 95 : role !== 9 && !lg ? 95 : role !== 9 ? 80 : 80,
      renderCell: params => {
        const { row } = params

        localStorage.setItem('percentGabineteWidthColumn', params.colDef.computedWidth)

        let percentContent

        if (row.isRevision && expandedRows.has(params.row.parentId)) {
          // Para las filas de revisión, muestra el registro de la revisión a modo de historial

          percentContent = getBlueprintPercent(row)

          return (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                {`${percentContent} %` || 'N/A'}
              </Typography>
            </Box>
          )
        } else if (!row.isRevision && !expandedRows.has(params.row.parentId)) {
          // Para las filas principales, muestra la el estado de la revisión actual
          percentContent = getBlueprintPercent(row)

          return (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                {`${percentContent} %` || 'N/A'}
              </Typography>
            </Box>
          )
        }
      }
    },
    {
      field: 'userName',
      headerName: 'ENCARGADO',
      width: userNameLocalWidth
        ? userNameLocalWidth
        : role === 9 && !lg
        ? 190
        : role !== 9 && !lg
        ? 190
        : role !== 9
        ? 155
        : 160,
      renderCell: params => {
        const { row } = params

        localStorage.setItem('userNameGabineteWidthColumn', params.colDef.computedWidth)

        let userNameContent

        if (row.isRevision && expandedRows.has(params.row.parentId)) {
          // Para las filas de revisión, muestra el autor de la revisión
          userNameContent = row.userName

          return (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                {userNameContent || 'N/A'}
              </Typography>
            </Box>
          )
        } else if (!row.isRevision && !expandedRows.has(params.row.parentId)) {
          // Para las filas principales, muestra el responsable actual del blueprint
          userNameContent = row.userName

          return (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                {userNameContent || 'N/A'}
              </Typography>
            </Box>
          )
        }
      }
    },
    {
      field: 'attentive',
      headerName: 'EN ESPERA DE REVISIÓN POR',
      width: userNameLocalWidth
        ? userNameLocalWidth
        : role === 9 && !lg
        ? 190
        : role !== 9 && !lg
        ? 190
        : role !== 9
        ? 155
        : 160,
      renderCell: params => {
        const { row } = params

        localStorage.setItem('userNameGabineteWidthColumn', params.colDef.computedWidth)

        let userNameContent

        if (row.isRevision && expandedRows.has(params.row.parentId)) {
          // Para las filas de revisión, muestra el autor de la revisión
          userNameContent = row.userName

          return (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                {renderRole(row) || 'N/A'}
              </Typography>
            </Box>
          )
        } else if (!row.isRevision && !expandedRows.has(params.row.parentId)) {
          // Para las filas principales, muestra el responsable actual del blueprint
          // userNameContent = row.userName

          return (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                {renderRole(row) || 'N/A'}
              </Typography>
            </Box>
          )
        }
      }
    },
    {
      field: 'lastTransmittal',
      headerName: 'Ultimo Transmittal',
      width: lastTransmittalLocalWidth
        ? lastTransmittalLocalWidth
        : role === 9 && !lg
        ? 180
        : role !== 9 && !lg
        ? 70
        : role !== 9
        ? 120
        : 160,
      renderCell: params => {
        const { row } = params

        localStorage.setItem('lastTransmittalGabineteWidthColumn', params.colDef.computedWidth)

        let lastTransmittalContent

        if (row.isRevision && expandedRows.has(params.row.parentId)) {
          // Para las filas de revisión, muestra el identificador del transmittal de la revisión en caso que la revision lo incluya
          lastTransmittalContent = row.lastTransmittal

          return (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                {lastTransmittalContent || ''}
              </Typography>
            </Box>
          )
        } else if (!row.isRevision && !expandedRows.has(params.row.parentId)) {
          // Para las filas principales, muestra el último transmital generado en ese blueprint
          lastTransmittalContent = row.lastTransmittal

          return (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                {lastTransmittalContent || ''}
              </Typography>
            </Box>
          )
        }
      }
    },
    {
      field: 'description',
      headerName: 'DESCRIPCIÓN',
      width: descriptionLocalWidth
        ? descriptionLocalWidth
        : role === 9 && !lg
        ? 200
        : role !== 9 && !lg
        ? 200
        : role !== 9
        ? 170
        : 190,
      renderCell: params => {
        const { row } = params

        localStorage.setItem('descriptionGabineteWidthColumn', params.colDef.computedWidth)

        let descriptionContent

        if (row.isRevision && expandedRows.has(params.row.parentId)) {
          // Para las filas de revisión, muestra la descripción de la revisión
          descriptionContent = row.description

          return (
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                justifyContent: 'space-between',
                alignContent: 'center',
                flexDirection: 'column'
              }}
            >
              <Box display='inline-flex' sx={{ justifyContent: 'space-between' }}>
                <Typography
                  noWrap
                  sx={{ overflow: 'hidden', my: 'auto', textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}
                >
                  {descriptionContent || 'Sin descripción'}
                </Typography>
              </Box>
            </Box>
          )
        } else if (!row.isRevision && !expandedRows.has(params.row.parentId)) {
          // Para las filas principales, muestra la descripción del blueprint recien cargado
          descriptionContent = row.description

          return (
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                justifyContent: 'space-between',
                alignContent: 'center',
                flexDirection: 'column'
              }}
            >
              <Box display='inline-flex' sx={{ justifyContent: 'space-between' }}>
                <Typography
                  noWrap
                  sx={{ overflow: 'hidden', my: 'auto', textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}
                >
                  {descriptionContent || 'Sin descripción'}
                </Typography>
              </Box>
            </Box>
          )
        }
      }
    },
    {
      field: 'files',
      headerName: 'ENTREGABLE',
      width: filesLocalWidth
        ? filesLocalWidth
        : role === 9 && !lg
        ? 450
        : role !== 9 && !lg
        ? 460
        : role !== 9
        ? 365
        : 365,
      renderCell: params => {
        const { row } = params

        localStorage.setItem('filesGabineteWidthColumn', params.colDef.computedWidth)

        if (row.isRevision && expandedRows.has(params.row.parentId)) {
          return (
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                justifyContent: 'space-between',
                alignContent: 'center',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Box display='inline-flex' sx={{ justifyContent: 'space-between', width: 'max-content' }}>
                <Typography>
                  <Link
                    color='inherit'
                    href={row.storageBlueprints.url}
                    target='_blank'
                    rel='noreferrer'
                    variant='body1'
                    noWrap
                    sx={{ fontSize: lg ? '0.8rem' : '1rem' }}
                  >
                    {row.storageBlueprints.name}
                  </Link>
                </Typography>
              </Box>
            </Box>
          )
        } else if (!row.isRevision && !expandedRows.has(params.row.parentId)) {
          return (
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                justifyContent: 'space-between',
                alignContent: 'center',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Box display='inline-flex' sx={{ justifyContent: 'space-between', width: 'max-content' }}>
                {row.storageBlueprints && Array.isArray(row.storageBlueprints) ? (
                  row.storageBlueprints.map((content, index) => (
                    <Typography key={index} noWrap sx={{ my: 'auto', textOverflow: 'clip', width: 'inherit' }}>
                      <Link
                        color='inherit'
                        key={index}
                        href={content.url}
                        target='_blank'
                        rel='noreferrer'
                        variant='body1'
                        noWrap
                        sx={{ fontSize: lg ? '0.8rem' : '1rem' }}
                      >
                        {content.name}
                      </Link>
                    </Typography>
                  ))
                ) : (
                  <Typography
                    noWrap
                    sx={{ overflow: 'hidden', my: 'auto', textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}
                  >
                    Sin entregable
                  </Typography>
                )}

                {authUser.uid === row.userId && !row.sentByDesigner && (
                  <IconButton
                    sx={{
                      my: 'auto',
                      ml: 2,
                      p: 0
                    }}
                    color='primary'
                    onClick={
                      (authUser.uid === row.userId && !row.sentByDesigner) ||
                      ((authUser.role === 6 || authUser.role === 7) &&
                        row.sentByDesigner &&
                        !row.approvedByDocumentaryControl) ||
                      (authUser.role === 9 &&
                        (row.approvedBySupervisor ||
                          row.approvedByContractAdmin ||
                          (row.approvedByDocumentaryControl && row.sentByDesigner)))
                        ? //row.userId === authUser.uid || authUser.role === 7 || authUser.role === 9
                          () => handleOpenUploadDialog(row)
                        : null
                    }
                  >
                    {row.storageBlueprints ? null : (
                      <Upload
                        sx={{
                          fontSize: lg ? '1rem' : '1.2rem',
                          color:
                            authUser.uid === row.userId && (!row.sentBySupervisor || !row.sentByDesigner)
                              ? theme.palette.success
                              : theme.palette.grey[500]
                        }}
                      />
                    )}
                  </IconButton>
                )}
              </Box>
            </Box>
          )
        }
      }
    },
    {
      field: 'storageHlcDocuments',
      headerName: 'HLC',
      width: hlcLocalWidth ? hlcLocalWidth : role === 9 && !lg ? 120 : role !== 9 && !lg ? 70 : role !== 9 ? 120 : 120,
      renderCell: params => {
        const { row } = params

        localStorage.setItem('hlcGabineteWidthColumn', params.colDef.computedWidth)

        const canGenerateBlueprint = checkRoleAndGenerateTransmittal(authUser.role, row)

        const canUploadHlc = row => {
          if (row.revision && typeof params.row.revision === 'string' && row.revisions.length > 0) {
            const sortedRevisions = [...row.revisions].sort((a, b) => new Date(b.date) - new Date(a.date))
            const lastRevision = sortedRevisions[0]

            if (
              (row.revision.charCodeAt(0) >= 66 || row.revision.charCodeAt(0) >= 48) &&
              row.approvedByDocumentaryControl === true &&
              !('lastTransmittal' in lastRevision)
            ) {
              return true
            }

            return false
          }

          return false
        }

        if (row.isRevision && expandedRows.has(params.row.parentId)) {
          return (
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                justifyContent: 'space-between',
                alignContent: 'center',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Box display='inline-flex' sx={{ justifyContent: 'space-between', width: 'max-content' }}>
                <Typography>
                  <Link
                    color='inherit'
                    href={row.storageBlueprints.url}
                    target='_blank'
                    rel='noreferrer'
                    variant='body1'
                    noWrap
                    sx={{ fontSize: lg ? '0.8rem' : '1rem' }}
                  >
                    {row.storageHlcDocuments?.name}
                  </Link>
                </Typography>
              </Box>
            </Box>
          )
        } else if (!row.isRevision && !expandedRows.has(params.row.parentId)) {
          return (
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                justifyContent: 'space-between',
                alignContent: 'center',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Box display='inline-flex' sx={{ justifyContent: 'space-between', width: 'max-content' }}>
                {row.storageHlcDocuments?.length > 0 && Array.isArray(row.storageHlcDocuments) ? (
                  row.storageHlcDocuments.map((content, index) => (
                    <Typography key={index} noWrap sx={{ my: 'auto', textOverflow: 'clip', width: 'inherit' }}>
                      <Link
                        color='inherit'
                        key={index}
                        href={content.url}
                        target='_blank'
                        rel='noreferrer'
                        variant='body1'
                        noWrap
                        sx={{ fontSize: lg ? '0.8rem' : '1rem' }}
                      >
                        {content?.name}
                      </Link>
                    </Typography>
                  ))
                ) : (
                  <Typography
                    noWrap
                    sx={{ overflow: 'hidden', my: 'auto', textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}
                  >
                    Sin HLC
                  </Typography>
                )}

                {(canGenerateBlueprint &&
                  authUser.role === 9 &&
                  row.approvedByDocumentaryControl &&
                  row.sentByDesigner &&
                  canUploadHlc(row)) ||
                (authUser.role === 9 &&
                  row.approvedByDocumentaryControl &&
                  row.sentBySupervisor &&
                  canUploadHlc(row)) ? (
                  <IconButton
                    sx={{
                      my: 'auto',
                      ml: 2,
                      p: 0,

                      opacity: 0.7
                    }}
                    color='success'
                    onClick={
                      authUser.role === 9 && row.approvedByDocumentaryControl
                        ? () => handleOpenUploadDialog(row)
                        : null
                    }
                  >
                    {row.storageHlcDocuments ? null : (
                      <Upload
                        sx={{
                          fontSize: '1rem'
                        }}
                      />
                    )}
                  </IconButton>
                ) : (
                  ''
                )}
              </Box>
            </Box>
          )
        }
      }
    },
    {
      field: 'date',
      headerName: 'Fecha de Creación',
      width: dateLocalWidth
        ? dateLocalWidth
        : role === 9 && !lg
        ? 120
        : role !== 9 && !lg
        ? 120
        : role !== 9
        ? 110
        : 120,
      renderCell: params => {
        if (params.row.date && typeof params.row.date === 'object' && 'seconds' in params.row.date) {
          const { row } = params

          localStorage.setItem('dateGabineteWidthColumn', params.colDef.computedWidth)

          let dateContent

          if (row.isRevision && expandedRows.has(params.row.parentId)) {
            const seconds = Number(row.date.seconds)
            if (!isNaN(seconds)) {
              const date = new Date(seconds * 1000)
              const formattedDate = date.toISOString().split('T')[0].split('-').reverse().join('/')
              dateContent = formattedDate
            } else {
              // Maneja el caso donde seconds no es un número.
              dateContent = 'Fecha inválida'
            }

            return (
              <Box
                sx={{
                  width: '100%',
                  overflow: 'hidden'
                }}
              >
                <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                  {dateContent}
                </Typography>
              </Box>
            )
          } else if (!row.isRevision && !expandedRows.has(params.row.parentId)) {
            const seconds = Number(row.date?.seconds)
            if (!isNaN(seconds)) {
              const date = new Date(seconds * 1000)
              const formattedDate = date.toISOString().split('T')[0].split('-').reverse().join('/')
              dateContent = formattedDate
            } else {
              // Maneja el caso donde seconds no es un número.
              dateContent = 'Fecha inválida'
            }

            return (
              <Box
                sx={{
                  width: '100%',
                  overflow: 'hidden'
                }}
              >
                <Typography noWrap sx={{ textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}>
                  {dateContent}
                </Typography>
              </Box>
            )
          }
        }
      }
    },
    {
      field: 'remarks',
      headerName: 'Observaciones',
      width: remarksLocalWidth
        ? remarksLocalWidth
        : role === 9 && !lg
        ? 195
        : role !== 9 && !lg
        ? 195
        : role !== 9
        ? 165
        : 180,
      renderCell: params => {
        const { row } = params
        localStorage.setItem('remarksGabineteWidthColumn', params.colDef.computedWidth)
        const permissionsData = permissions(row, authUser)
        const canApprove = permissionsData?.approve
        const canReject = permissionsData?.reject

        const flexDirection = md ? 'row' : 'column'

        const buttons = renderButtons(row, flexDirection, canApprove, canReject)

        if (row.isRevision && expandedRows.has(params.row.parentId)) {
          return (
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                justifyContent: 'space-between',
                alignContent: 'center',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Box display='inline-flex' sx={{ justifyContent: 'space-between' }}>
                <Typography
                  noWrap
                  sx={{ overflow: 'hidden', my: 'auto', textOverflow: 'clip', fontSize: lg ? '0.8rem' : '1rem' }}
                >
                  {row.remarks || 'Sin Observasión'}
                </Typography>
              </Box>
            </Box>
          )
        } else if (!row.isRevision && !expandedRows.has(params.row.parentId)) {
          return (
            <>
              <Box
                sx={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'space-between',
                  alignContent: 'center',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {canApprove || canReject ? (
                  md ? (
                    buttons
                  ) : (
                    <Select
                      labelId='demo-simple-select-label'
                      id='demo-simple-select'
                      size='small'
                      IconComponent={() => <MoreHorizIcon />}
                      sx={{
                        '& .MuiSvgIcon-root': { position: 'absolute', margin: '20%', pointerEvents: 'none !important' },
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '& .MuiSelect-select': { backgroundColor: theme.palette.customColors.tableHeaderBg },
                        '& .MuiList-root': { display: 'flex', flexDirection: 'column' }
                      }}
                    >
                      {buttons}
                    </Select>
                  )
                ) : (
                  <Typography sx={{ fontSize: lg ? '0.8rem' : '1rem' }}>{renderStatus(row)}</Typography>
                )}
              </Box>
            </>
          )
        }
      }
    },
    {
      field: 'clientApprove',
      headerName: 'Cliente',
      width: clientLocalWidth ? clientLocalWidth : role === 9 && !lg ? 160 : role !== 9 && !lg ? 70 : role !== 9 ? 120 : 120,
      renderCell: params => {
        const { row, currentPetition } = params

        localStorage.setItem('clientGabineteWidthColumn', params.colDef.computedWidth)

        const canApprove = checkRoleAndApproval(authUser.role, row)
        const canReject = checkRoleAndApproval(authUser.role, row)
        const canGenerateBlueprint = checkRoleAndGenerateTransmittal(authUser.role, row)
        const canResume = checkRoleAndResume(authUser.role, row)

        const flexDirection = md ? 'row' : 'column'

        const disabled = petition?.otFinished

        const buttons = renderButtons(row, flexDirection, canApprove, canReject, disabled, canResume)

        if (row.isRevision && expandedRows.has(params.row.parentId)) {
          return ''
        } else if (!row.isRevision && !expandedRows.has(params.row.parentId)) {
          return (
            <Box sx={{ padding: '0rem!important', margin: '0rem!important' }}>
              <Box
                sx={{
                  display: 'flex',
                  width: '100%',
                  padding: '0rem!important',
                  margin: '0rem!important',
                  justifyContent: 'space-between',
                  alignContent: 'right',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {canApprove || canReject ? (
                  md ? (
                    buttons
                  ) : (
                    <Select
                      labelId='demo-simple-select-label'
                      id='demo-simple-select'
                      size='small'
                      IconComponent={() => <MoreHorizIcon />}
                      sx={{
                        '& .MuiSvgIcon-root': {
                          position: 'absolute',
                          margin: '20%',
                          pointerEvents: 'none !important'
                        },
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '& .MuiSelect-select': { backgroundColor: theme.palette.customColors.tableHeaderBg },
                        '& .MuiList-root': { display: 'flex', flexDirection: 'column' }
                      }}
                    >
                      {buttons}
                    </Select>
                  )
                ) : canGenerateBlueprint ? (
                  'Generar Transmittal'
                ) : canResume ? (
                  md ? (
                    buttons
                  ) : (
                    <Select
                      labelId='demo-simple-select-label'
                      id='demo-simple-select'
                      size='small'
                      IconComponent={() => <MoreHorizIcon />}
                      sx={{
                        '& .MuiSvgIcon-root': {
                          position: 'absolute',
                          margin: '20%',
                          pointerEvents: 'none !important'
                        },
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '& .MuiSelect-select': { backgroundColor: theme.palette.customColors.tableHeaderBg },
                        '& .MuiList-root': { display: 'flex', flexDirection: 'column' }
                      }}
                    >
                      {buttons}
                    </Select>
                  )
                ) : (
                  ''
                )}
              </Box>
            </Box>
          )
        }
      }
    }
  ]

  const getSelectableRows = () => {
    if (showReasignarSection) {
      // Si la sección de reasignación está habilitada, permite seleccionar todas las filas
      return rows
    }

    // Crea un mapa para rastrear la fila con el contador superior para cada `type`
    const typeMap = {}

    rows.forEach(row => {
      const type = `${row.id.split('-')[1]}-${row.id.split('-')[2]}`
      const counter = parseInt(row.id.split('-')[3], 10)

      if (!typeMap[type] || counter > typeMap[type].counter) {
        typeMap[type] = { row, counter }
      }
    })

    // Solo permite la selección de la fila con el contador superior para cada `type`
    return Object.values(typeMap).map(item => item.row)
  }

  const isRowSelectable = params => {
    if (authUser.role === 7) {
      if (showReasignarSection) {
        // Si la sección de reasignación está habilitada, permite seleccionar cualquier fila
        return true
      }

      // Obtiene las filas seleccionables según el `type` y el contador superior
      const selectableRows = getSelectableRows()

      return selectableRows.some(
        selectableRow =>
          selectableRow.id === params.row.id &&
          (params.row.revision === 'Iniciado' ||
            params.row.revision === 'A' ||
            (params.row.revision === 'B' && !params.row.lastTransmittal))
      )
    }

    if (params.row.revision && typeof params.row.revision === 'string' && params.row.revisions.length > 0) {
      const sortedRevisions = [...params.row.revisions].sort((a, b) => new Date(b.date) - new Date(a.date))
      const lastRevision = sortedRevisions[0]

      return (
        (params.row.revision.charCodeAt(0) >= 66 || params.row.revision.charCodeAt(0) >= 48) &&
        params.row.storageBlueprints &&
        (params.row.sentByDesigner || params.row.sentBySupervisor) &&
        params.row.approvedByDocumentaryControl === true &&
        !('lastTransmittal' in lastRevision)
      )
    }

    return false
  }

  return (
    <Card sx={{ height: 'inherit' }}>
      <DataGridPremium
        sx={{
          height: 600,
          maxHeight: lg ? '700px' : '400px',
          width: '100%',
          '& .MuiDataGrid-cell--withRenderer': {
            alignItems: 'baseline'
          },
          '& .MuiDataGrid-virtualScroller': {
            minHeight: '200px'
          },
          '& .no-checkbox': {
            backgroundColor: theme.palette.mode === 'dark' ? '#666666' : '#CDCDCD'
          }
        }}
        classes={{ root: classes.root }}
        slotProps={{
          baseCheckbox: {
            sx: {
              '& .MuiSvgIcon-root': {
                color: theme.palette.primary.main,
                opacity: 0.7,
                fontSize: lg ? '1rem' : '1.2rem',
                padding: '0rem',
                margin: '0rem'
              },
              '& .MuiCheckbox-root': {
                // No aplicar estilos que podrían ocultar el checkbox si es necesario
              }
            }
          }
        }}
        apiRef={apiRef}
        checkboxSelection={authUser.role === 9 || authUser.role === 7}
        onRowSelectionModelChange={handleSelectionChange}
        disableRowSelectionOnClick
        isRowSelectable={isRowSelectable}
        getRowId={row => row.id}
        getRowClassName={params => {
          // Verificamos si la fila es una revisión y aplica una clase condicional
          const row = apiRef.current.getRow(params.id)
          if (row && row.isRevision) {
            return 'no-checkbox' // clase CSS que oculta el checkbox
          }

          return ''
        }}
        rows={filteredRows}
        useGridApiRef
        columns={columns}
        columnVisibilityModel={{
          clientApprove: authUser.role === 9,
          storageHlcDocuments: authUser.role === 9,
          lastTransmittal: authUser.role === 9
        }}
        localeText={esES.components.MuiDataGrid.defaultProps.localeText}
        sortingModel={defaultSortingModel}
        getRowHeight={row => (row.id === currentRow ? 'auto' : 'auto')}
        isRowExpanded={row => expandedRows.has(row.id)}
      />
      {doc && openAlert && (
        <AlertDialogGabinete
          open={openAlert}
          setOpenAlert={setOpenAlert}
          buttonClicked={buttonClicked}
          setButtonClicked={setButtonClicked}
          handleClose={handleCloseAlert}
          approves={approve}
          authUser={authUser}
          setRemarksState={setRemarksState}
          remarksState={remarksState}
          blueprint={doc}
          petition={petition}
          petitionId={petitionId}
          error={error}
          setError={setError}
          setDoc={setDoc}
        ></AlertDialogGabinete>
      )}

      <Dialog sx={{ '& .MuiPaper-root': { maxWidth: '1000px', width: '100%' } }} open={openDialog}>
        <DialogContent>
          <UploadBlueprintsDialog
            handleClose={handleCloseUploadDialog}
            doc={doc}
            roleData={roleData}
            petitionId={petitionId}
            currentRow={currentRow}
            petition={petition}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default TableGabinete
