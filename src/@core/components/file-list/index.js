import { Grid, Paper, Typography, IconButton } from '@mui/material'
import Icon from 'src/@core/components/icon'
import { getFileIcon } from 'src/context/google-drive-functions/fileValidation'
import { useTheme } from '@mui/material/styles'

const FileList = ({ files, handleRemoveFile }) => {
  const theme = useTheme()

  if (!files) return null

  return (
    <Grid container spacing={2} sx={{ justifyContent: 'center', m: 2 }}>
      <Grid item key={files.name}>
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px',
            border: `4px solid ${theme.palette.primary.main}`,
            borderRadius: '4px',
            width: '220px',
            position: 'relative'
          }}
        >
          {files.type.startsWith('image') ? (
            <img width={50} height={50} alt={files.name} src={URL.createObjectURL(files)} />
          ) : (
            <Icon icon={getFileIcon(files.type)} fontSize={50} />
          )}
          <Typography variant='body2' sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', ml: '10px' }}>
            {`... ${files.name.slice(files.name.length - 15, files.name.length)}`}
          </Typography>
          <IconButton
            onClick={handleRemoveFile}
            sx={{
              position: 'absolute',
              top: '0px',
              right: '0px'
            }}
          >
            <Icon icon='mdi:close' fontSize={20} />
          </IconButton>
        </Paper>
      </Grid>
    </Grid>
  )
}

export default FileList
