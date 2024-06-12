import * as React from 'react'
import { unstable_useNumberInput as useNumberInput } from '@mui/base/unstable_useNumberInput'
import { styled } from '@mui/system'
import { unstable_useForkRef as useForkRef } from '@mui/utils'

const NumberInputBasic = React.forwardRef(function NumberInputBasic(props, ref) {
  const { value, handleChange, handleBlur, min, max, disabled } = props

  const handleInputChange = event => {
    const newValue = event.target.value
    if (/^\d*$/.test(newValue) && (newValue === '' || newValue.charAt(0) !== '0')) {
      handleChange(newValue)
    }
  }

  const { getRootProps, getInputProps, getIncrementButtonProps, getDecrementButtonProps, focused } = useNumberInput({
    value,
    disabled,
    min,
    max,
    onInputChange: handleInputChange,
    onChange: (event, newValue) => handleChange(newValue),
    onKeyDown: (e, value) => {
      // Permitir solo teclas numéricas y algunas teclas especiales
      const allowedKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End']

      if ((e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 96 && e.keyCode <= 105)) {
        console.log('e.key: ', e.key)
        console.log('e.keyCode: ', e.keyCode)
        //e.preventDefault()

        const numericValue = Math.min(parseInt(e.key, 10), 12)
        if (!isNaN(numericValue)) {
          if (handleChange) {
            handleChange(numericValue)
          }
        }
      } else {
        if (e.keyCode <= 48 || e.keyCode >= 57 || e.keyCode <= 96 || e.keyCode >= 105) {
          console.log('2e.key: ', e.key)
          console.log('2e.keyCode: ', e.keyCode)
          e.preventDefault()
        }
      }
    }
  })

  const inputProps = getInputProps()
  inputProps.ref = useForkRef(inputProps.ref, ref)

  return (
    <StyledInputRoot {...getRootProps()} className={focused ? 'focused' : null}>
      <StyledStepperButton {...getIncrementButtonProps()} className='increment' disabled={disabled}>
        ▴
      </StyledStepperButton>
      <StyledStepperButton {...getDecrementButtonProps()} className='decrement' disabled={disabled}>
        ▾
      </StyledStepperButton>
      <StyledInputElement {...inputProps} onBlur={handleBlur} />
    </StyledInputRoot>
  )
})

const blue = {
  100: '#DAECFF',
  200: '#B6DAFF',
  400: '#3399FF',
  500: '#007FFF',
  600: '#0072E5',
  700: '#0059B2',
  900: '#003A75'
}

const grey = {
  50: '#F3F6F9',
  100: '#E5EAF2',
  200: '#DAE2ED',
  300: '#C7D0DD',
  400: '#B0B8C4',
  500: '#9DA8B7',
  600: '#6B7A90',
  700: '#434D5B',
  800: '#303740',
  900: '#1C2025'
}

const StyledInputRoot = styled('div')(
  ({ theme }) => `
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  border-radius: 8px;
  color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
  background: ${theme.palette.mode === 'dark' ? grey[900] : '#fff'};
  border: 1px solid ${theme.palette.mode === 'dark' ? grey[700] : grey[200]};
  box-shadow: 0px 2px 4px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0, 0.5)' : 'rgba(0,0,0, 0.05)'};
  display: grid;
  grid-template-columns: 1fr 19px;
  grid-template-rows: 1fr 1fr;
  overflow: hidden;
  column-gap: 8px;
  padding: 4px;

  &.focused {
    border-color:  ${'#88b340'};
    /* box-shadow: 0 0 0 3px ${theme.palette.mode === 'dark' ? '#88b340' : '#88b340'}; */

    & button:hover {
      background:  ${'#88b340'};
    }
    // firefox
    &:focus-visible {
      outline: 0;
    }
  }
  `
)

const StyledInputElement = styled('input')(
  ({ theme }) => `
  font-size: 0.875rem;
  font-family: inherit;
  font-weight: 400;
  line-height: 1.5;
  grid-column: 1/2;
  grid-row: 1/3;
  color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
  background: inherit;
  border: none;
  border-radius: inherit;
  padding: 8px 12px;
  outline: 0;
  width: 100%;
`
)

const StyledStepperButton = styled('button')(
  ({ theme }) => `
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  align-items: center;
  appearance: none;
  padding: 0;
  width: 19px;
  height: 19px;
  font-family: system-ui, sans-serif;
  font-size: 0.875rem;
  line-height: 1;
  box-sizing: border-box;
  background: ${theme.palette.mode === 'dark' ? grey[900] : '#fff'};
  border: 0;
  color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 120ms;

  &.increment {
    grid-column: 2/3;
    grid-row: 1/2;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    border: 1px solid;
    border-bottom: 0;
    border-color: ${theme.palette.mode === 'dark' ? grey[800] : grey[200]};
    background: ${theme.palette.mode === 'dark' ? grey[900] : grey[50]};
    color: ${theme.palette.mode === 'dark' ? grey[200] : grey[900]};

    &:hover {
      cursor: pointer;
      color: #FFF;
      background: ${'#88b340'};
      border-color:  ${'#88b340'};
    }
  }

  &.decrement {
    grid-column: 2/3;
    grid-row: 2/3;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    border: 1px solid;
    border-color: ${theme.palette.mode === 'dark' ? grey[800] : grey[200]};
    background: ${theme.palette.mode === 'dark' ? grey[900] : grey[50]};
    color: ${theme.palette.mode === 'dark' ? grey[200] : grey[900]};

    &:hover {
      cursor: pointer;
      color: #FFF;
      background: ${'#88b340'};
      border-color:  ${'#88b340'};
    }
  }
  `
)

export default NumberInputBasic
