import { createTheme } from '@mui/material/styles';

// Softer, minimal color palette
const palette = {
  primary: {
    main: '#2b6777', // deep teal
    contrastText: '#fff',
  },
  secondary: {
    main: '#52ab98', // mint
    contrastText: '#fff',
  },
  background: {
    default: '#f2f2f2', // light grey
    paper: '#ffffff', // white
  },
  info: {
    main: '#c8d8e4', // soft blue
    contrastText: '#2b6777',
  },
  text: {
    primary: '#2b6777',
    secondary: '#52ab98',
  },
};

const theme = createTheme({
  palette,
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      'Fira Sans',
      'Droid Sans',
      'Helvetica Neue',
      'sans-serif',
    ].join(','),
    h5: {
      fontWeight: 600,
      color: palette.primary.main,
    },
    h6: {
      fontWeight: 500,
      color: palette.primary.main,
    },
    body1: {
      color: palette.primary.main,
    },
    body2: {
      color: palette.primary.main,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(44, 103, 119, 0.04)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          background: '#fff',
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
