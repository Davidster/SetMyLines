import React, { Component } from "react";
import ReactDOM from "react-dom";
import { createMuiTheme, MuiThemeProvider } from "@material-ui/core/styles";
import { BrowserRouter as Router, Route, Switch, Redirect } from "react-router-dom";
import { withRouter } from "react-router";

import * as serviceWorker from "./serviceWorker";
import Api from "./api";
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
    primary:   { main: "#6001d2" },
    secondary: { main: "#0179ff" }
  },
});

const UNAUTHENTICATED_PATHS = [
  "/login",
  "/verifyEmail",
  "/unsubscribeEmail"
];

const pathRequiresAuthentication = path => {
  return UNAUTHENTICATED_PATHS.indexOf(path) < 0;
};

class Routes extends Component {

  constructor(props) {
    super(props);
    this.state = {
      signedIn: false
    };
  }

  setSignedIn = (signedIn) => {
    this.setState({ signedIn: signedIn });
  };

  checkIsLoggedIn = async () => {
    await Api.validateToken();
    this.setSignedIn(true);
  };

  componentDidMount() {
    if(pathRequiresAuthentication(this.props.location.pathname)) {
      this.checkIsLoggedIn().catch(err => {
        console.log(err);
        console.log("Error authorizing user. Redirecting to login page");
        this.props.history.replace("/login");
      });
    }
  }

  render() {
    const { signedIn } = this.state;
    return (
      (pathRequiresAuthentication(this.props.location.pathname) && !signedIn) ? (<>
        <AppBar />
        <LoadingDialog text="Verifying your identity" />
      </>) : (
        <Switch>
          <Route path="/" exact component={MainPage} />
          <Route path="/settings" component={Settings} />
          <Route path="/login" component={()=><Login setSignedIn={this.setSignedIn}/>} />
          <Route path="/registerEmail" component={RegisterEmail} />
          <Route path="/verifyEmail" component={VerifyEmail} />
          <Route path="/unsubscribeEmail" component={UnsubscribeEmail} />
          <Route render={() => <Redirect to="/login"/>}/>
        </Switch>
      )
    );
  }
};

const RoutesWithRouter = withRouter(Routes);

class Root extends Component {

  constructor(props){
    super(props);
  }

  render() {
    return (
      <MuiThemeProvider theme={theme}>
        <Router>
          <RoutesWithRouter/>
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
