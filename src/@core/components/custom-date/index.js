import React from 'react'
import moment from 'moment'
import { Box, FormControl, ListItem, Typography } from '@mui/material'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
// AdapterMoment vive en su propia ruta; desde la raiz llega undefined y el
// DatePicker se cae. Los otros tres usos del proyecto ya lo importan asi.
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import { unixToDate } from 'src/@core/components/unixToDate'

function DateListItem({ editable, label, value, onChange, initialValue, customMinDate = null }) {
  return (
    <>
      {editable ? (
        <ListItem id={`list-${label}`} divider={!editable}>
          <FormControl fullWidth sx={{ '& .MuiFormControl-root': { width: '100%' } }}>
            <LocalizationProvider dateAdapter={AdapterMoment} adapterLocale='es'>
              <DatePicker
                dayOfWeekFormatter={day => day.substring(0, 2).toUpperCase()}
                minDate={customMinDate || moment().subtract(1, 'year')}
                maxDate={moment().add(1, 'year')}
                label={label}
                value={value}
                onChange={onChange}
                slotProps={{
                  textField: {
                    size: 'small',
                    required: true,
                    variant: 'standard',
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          </FormControl>
        </ListItem>
      ) : (
        initialValue &&
        initialValue.seconds && (
          <ListItem id={`list-${label}`} divider={!editable}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Typography component='div' sx={{ width: '30%' }}>
                {label}
              </Typography>
              <Typography component='div' sx={{ width: '70%' }}>
                {initialValue && unixToDate(initialValue.seconds)[0]}
              </Typography>
            </Box>
          </ListItem>
        )
      )}
    </>
  )
}

export default DateListItem
