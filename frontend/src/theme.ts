import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#3a608f' },
    warning: { main: '#F5C842', light: '#FAEEDA', dark: '#8B6914' },
    success: { main: '#97C459', light: '#EAF3DE', dark: '#3B6D11' },
    error: { main: '#C45959', light: '#FCEBEB', dark: '#A32D2D' },
    info: { main: '#3a608f', light: '#E6F1FB', dark: '#0C447C' },
    background: { default: '#f8f9ff' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8, fontWeight: 600 },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: { borderRadius: 12, overflow: 'hidden' },
      },
    },
  },
});
