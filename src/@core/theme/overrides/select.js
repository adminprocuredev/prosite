const select = theme => {
  return {
    MuiSelect: {
      styleOverrides: {
        select: {
          '&.MuiTablePagination-select': {
            minWidth: '1.5rem !important'
          },
          '&.Mui-disabled ~ .MuiOutlinedInput-notchedOutline': {
            borderColor: `rgba(${theme.palette.customColors.mainRgb}, 0.22)`
          }
        }
      }
    }
  }
}

export default select
