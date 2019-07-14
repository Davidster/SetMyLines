import React, { Component } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import { withRouter } from "react-router";


import * as Api from "../api";

class Login extends Component {

    constructor(props) {
      super(props);
    }

    checkIfAlreadyAuthorized = async () => {
      // check if we were redirected from Yahoo with an authorization code
      let params = new URLSearchParams(window.location.search);
      let code = params.get("code");
      if(code) {
        await Api.loginCallback(code);
      }
      try {
        await this.props.checkIsLoggedIn();
        this.props.history.replace("/");
      } catch(err) {
        console.log(err);
        console.log("User is not logged in");
      }
    };

    handleLoginClick = async () => {
      const { loginUrl } = await Api.getLoginUrl();
      window.location.replace(loginUrl);
    };

    componentDidMount() {
      this.checkIfAlreadyAuthorized();
    }

    render() {
      return (
        <Dialog open={true} aria-labelledby="form-dialog-title">
          <DialogTitle id="form-dialog-title">Welcome</DialogTitle>
          <DialogContent>
            <DialogContentText>
              In order for setmylines.com to work, you must first sign into your Yahoo account.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button color="primary" onClick={() => { this.handleLoginClick(this.props); }}>
              Sign into Yahoo
            </Button>
          </DialogActions>
        </Dialog>
      );
    }

}

export default withRouter(Login);