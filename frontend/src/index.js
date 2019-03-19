import React from 'react';
import ReactDOM from 'react-dom';
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import './index.css';
import Teams from './pages/Teams';
import * as serviceWorker from './serviceWorker';

const theme = createMuiTheme({
  palette: {
    primary: {
      main: "#6001d2"
    },
    secondary: {
      main: "#0179ff"
    }
  },
});

ReactDOM.render(
  <MuiThemeProvider theme={theme}><Teams /></MuiThemeProvider>,
  document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
