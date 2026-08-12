import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { MOTIVOS } from 'src/context/google-drive-functions/nombresEntregables'
import { useGoogleDriveFolder } from 'src/context/google-drive-functions/useGoogleDriveFolder'
import { validateFiles } from 'src/context/google-drive-functions/fileValidation'
import { useFirebase } from 'src/context/useFirebase'

/**
 * Carga masiva de documentos de una OT. Incidencia Gabinete 11.
 *
 * Hasta ahora había que abrir cada entregable y subir su archivo de a uno, que
 * es lo que hace lento el control documental de una OT con muchos entregables.
 * Aquí se sueltan todos juntos y cada archivo se asigna al entregable cuyo
 * nombre esperado coincide — la misma regla que valida la carga individual, no
 * una copia.
 *
 * Lo que NO hace: adivinar. Un archivo que no corresponde a ningún entregable,
 * o que podría ser de dos, se muestra y se deja fuera. Subir "el que más se
 * parece" en un sistema de control documental es peor que no subir nada.
 */
const DialogCargaMasiva = ({ open, onClose, petition, blueprints }) => {
  const { authUser } = useFirebase()
  const { emparejarLoteConEntregables, handleFileUpload } = useGoogleDriveFolder()

  const [emparejados, setEmparejados] = useState([])
  const [subiendo, setSubiendo] = useState(false)
  const [resultados, setResultados] = useState({})
  const [error, setError] = useState(null)

  // Solo participan los entregables vivos: los borrados siguen en la colección.
  const entregablesVivos = (blueprints || []).filter(b => !b.deleted)

  const { getRootProps, getInputProps } = useDropzone({
    multiple: true,
    // Cambiar la selección a mitad de una subida dejaría subiendo archivos que
    // ya no están en la tabla, y sus errores no se verían.
    disabled: subiendo,
    onDrop: aceptados => {
      if (subiendo) return

      // La selección nueva reemplaza a la anterior aunque no sirva. Si no, un
      // lote inválido dejaba en pantalla el lote anterior, listo para subirse.
      setError(null)
      setResultados({})
      setEmparejados([])

      const invalidos = validateFiles(aceptados).filter(f => !f.isValid)
      if (invalidos.length > 0) {
        setError(invalidos[0].msj)

        return
      }

      setEmparejados(emparejarLoteConEntregables(aceptados, entregablesVivos, authUser))
    }
  })

  // Los que ya subieron quedan fuera: si no, reintentar tras un fallo parcial
  // volvería a subir los que sí habían funcionado y dejaría duplicados en Drive.
  const listos = emparejados.filter(e => e.motivo === 'ok' && !(resultados[e.archivo.name] || {}).ok)

  const handleSubir = async () => {
    setSubiendo(true)
    setError(null)

    // De a uno y en serie a propósito: cada subida crea carpetas en Drive si no
    // existen, y en paralelo dos archivos de la misma revisión crearían la
    // misma carpeta dos veces.
    for (const { archivo, blueprint } of listos) {
      try {
        await handleFileUpload(archivo, blueprint, petition.id, petition)
        setResultados(prev => ({ ...prev, [archivo.name]: { ok: true } }))
      } catch (e) {
        setResultados(prev => ({ ...prev, [archivo.name]: { ok: false, msj: e.message || 'No se pudo subir' } }))
      }
    }

    setSubiendo(false)
  }

  const handleCerrar = () => {
    if (subiendo) return
    setEmparejados([])
    setResultados({})
    setError(null)
    onClose()
  }

  const estadoDe = entrada => {
    const resultado = resultados[entrada.archivo.name]
    if (resultado) return resultado.ok ? <Chip size='small' color='success' label='Subido' /> : <Chip size='small' color='error' label={resultado.msj} />

    return entrada.motivo === 'ok' ? (
      <Chip size='small' color='info' variant='outlined' label={MOTIVOS.ok} />
    ) : (
      <Chip size='small' color='warning' variant='outlined' label={MOTIVOS[entrada.motivo]} />
    )
  }

  return (
    <Dialog open={open} onClose={handleCerrar} maxWidth='md' fullWidth>
      <DialogTitle>Carga masiva de documentos {petition && `— OT ${petition.ot}`}</DialogTitle>
      <DialogContent>
        <Typography variant='body2' sx={{ mb: 3 }}>
          Suelta aquí todos los documentos de la OT. Cada archivo se asigna al entregable que espera ese nombre. Los que
          no correspondan a ninguno quedan fuera y se listan más abajo.
        </Typography>

        <div {...getRootProps({ className: 'dropzone' })}>
          <input {...getInputProps()} />
          <Box
            sx={{
              my: 3,
              p: 5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backdropFilter: 'contrast(0.8)',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            <Typography color='textSecondary'>
              <Link component='span'>Haz click aquí</Link> o arrastra los archivos.
            </Typography>
          </Box>
        </div>

        {error && (
          <Alert severity='error' sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        {emparejados.length > 0 && (
          <Table size='small' sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Archivo</TableCell>
                <TableCell>Entregable</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {emparejados.map((entrada, indice) => (
                // La clave lleva el índice: dos archivos del lote pueden
                // llamarse igual si vienen de carpetas distintas.
                <TableRow key={`${entrada.archivo.name}-${indice}`}>
                  <TableCell sx={{ wordBreak: 'break-all' }}>{entrada.archivo.name}</TableCell>
                  <TableCell>{entrada.blueprint ? entrada.blueprint.id : '—'}</TableCell>
                  <TableCell>{estadoDe(entrada)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {emparejados.length > 0 && (
          <Typography variant='body2' sx={{ mt: 3 }}>
            {listos.length} de {emparejados.length} archivos {listos.length === 1 ? 'queda' : 'quedan'} por subir.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCerrar} disabled={subiendo}>
          Cerrar
        </Button>
        <Button onClick={handleSubir} variant='contained' disabled={subiendo || listos.length === 0}>
          {subiendo ? <CircularProgress size={20} /> : `Subir ${listos.length} archivo${listos.length === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DialogCargaMasiva
