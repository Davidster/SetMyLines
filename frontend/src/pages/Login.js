import React, { Component } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

import * as Api from "../api";

export default props => {

  // check if we are already logged
  Api.validateToken().then(() => {
    console.log("User is already signed in. Redirecting to main page.");
    window.location.replace("/");
  }).catch(()=>{});

  return (
    <Dialog open={true} aria-labelledby="form-dialog-title">
      <DialogTitle id="form-dialog-title">Welcome</DialogTitle>
      <DialogContent>
        <DialogContentText>
          In order for setmylines.com to work, you must first sign into your Yahoo account.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={()=>{ window.location.replace("/api/login") }}>
          Sign into Yahoo
        </Button>
      </DialogActions>
    </Dialog>
  );
};
