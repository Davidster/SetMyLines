import React, { Component } from "react";
import ReactDOM from "react-dom";
import { createMuiTheme, MuiThemeProvider } from "@material-ui/core/styles";
import { BrowserRouter as Router, Route } from "react-router-dom";

import * as serviceWorker from "./serviceWorker";
import * as Api from "./api";
import LoadingDialog from "./components/LoadingDialog";
import AppBar from "./components/AppBar";
import MainPage from "./pages/MainPage";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import RegisterEmail from "./pages/RegisterEmail";
import VerifyEmail from "./pages/VerifyEmail";
import UnsubscribeEmail from "./pages/UnsubscribeEmail";

import "./index.css";

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

const UNAUTHENTICATED_PATHS = [
  "/login",
  "/verifyEmail",
  "/unsubscribeEmail"
];

const pathRequiresAuthentication = () => {
  return UNAUTHENTICATED_PATHS.indexOf(window.location.pathname) < 0;
};

class Root extends Component {

  constructor(props){
    super(props);
    this.state = {
      signedIn: false
    };
    console.log("PATHNAME", window.location.pathname);
    if(pathRequiresAuthentication()) {
      Api.validateToken().then(() => {
        this.setState({ signedIn: true });
      }).catch(err => {
        if(err.status === 401) {
          console.log("validateToken responded with 401. redirecting to login page");
          window.location.href = "/login";
        }
        console.log(err);
      });
    }
  }

  render() {
    const { signedIn } = this.state;
    return (
      <MuiThemeProvider theme={theme}>
        <Router>
        {(pathRequiresAuthentication() && !signedIn) ? (<>
          <AppBar />
          <LoadingDialog text="Verifying your identity" />
        </>) : (<>
          <Route path="/" exact component={MainPage} />
          <Route path="/settings" component={Settings} />
          <Route path="/login" component={Login} />
          <Route path="/registerEmail" component={RegisterEmail} />
          <Route path="/verifyEmail" component={VerifyEmail} />
          <Route path="/unsubscribeEmail" component={UnsubscribeEmail} />
        </>)}
        </Router>
      </MuiThemeProvider>
    );
  }
}

ReactDOM.render(<Root/>, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
