import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#3a608f' },
    warning: { main: '#F5C842', light: '#FFF8E5', dark: '#8B6914' },
    success: { main: '#97C459', light: '#EAF3DE', dark: '#3B6D11' },
    background: { default: '#f8f9ff' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8, fontWeight: 600 },
      },
    },
  },
});
