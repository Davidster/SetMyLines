import React from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";

const CircularProgresss = props => (
  <CircularProgress {...props} thickness={props.thiccness}/>
);

const LoadingDialog = props => {
  return (
    <Dialog open={!!props.text} aria-labelledby="form-dialog-title" className="loadingDialog">
      <DialogTitle className="title" id="form-dialog-title">{props.text}</DialogTitle>
      <DialogContent className="progress">
        <CircularProgresss size={200} thiccness={2.4}/>
      </DialogContent>
    </Dialog>
  );
}

export default LoadingDialog;
