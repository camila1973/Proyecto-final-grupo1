import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#3a608f' },
    warning: { main: '#e8c84a' },
    background: { default: '#f8f9ff' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none' },
      },
    },
  },
});
