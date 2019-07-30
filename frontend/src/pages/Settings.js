import React, { Component } from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";
import { Prompt } from "react-router";
import validate from "validate.js";

import Api from "../api";
import AppBar from "../components/AppBar";
import LoadingDialog from "../components/LoadingDialog";

import "./Settings.css";

class Settings extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: "Loading settings",
      currentEmailAddress: "",
      newEmailAddress: "",
      newEmailAddressValid: true,
      subscriptionMap: undefined
    };
    this.loadSettings();
  }

  componentDidUpdate = () => {
    if(this.findUnsavedChanges()) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = undefined;
    }
  };

  loadSettings = async () => {
    const { email: { address, isVerified } = {}, subscriptionMap } = await Api.getSettings();
    this.setState({
      loading: undefined,
      currentEmailAddress: address || "",
      newEmailAddress: address || "",
      subscriptionMap: subscriptionMap,
      emailFieldLabel: this.getEmailFieldLabel(!!address, isVerified)
    });
  };

  getEmailFieldLabel = (emailRegistered, emailVerified) => {
    if(!emailRegistered) {
      return "Please enter an email address for receiving line update reports:";
    } else if(!emailVerified) {
      return "Please validate your email address by visiting the link that was sent to you";
    }
    return "Your email address is registered and verified.";
  };

  handleEmailChange = ({ target: { value: email } }) => {
    this.setState({
      newEmailAddress: email,
      newEmailAddressValid: (email === "") || !validate({from: email}, {from: {email: true}})
    });
  };

  handleSaveClick = async () => {
    this.setState({
      loading: "Updating settings"
    });
    const { email: { address, isVerified } = {}, subscriptionMap } = await Api.updateSettings(this.state.newEmailAddress);
    this.setState({
      loading: undefined,
      currentEmailAddress: address || "",
      newEmailAddress: address || "",
      subscriptionMap: subscriptionMap,
      emailFieldLabel: this.getEmailFieldLabel(!!address, isVerified)
    });
  };

  findUnsavedChanges = () => {
    const { currentEmailAddress, newEmailAddress } = this.state;
    return currentEmailAddress !== newEmailAddress;
  };

  render() {
    const { loading,
            currentEmailAddress,
            newEmailAddress,
            emailFieldLabel,
            newEmailAddressValid,
            subscriptionMap } = this.state;
    const hasUnsavedChanges = this.findUnsavedChanges();
    return (
      <>
        <Prompt 
          when={hasUnsavedChanges}
          message="You have unsaved changes, are you sure you want to leave?" />
        <AppBar title="Settings"
                additionalButtons={[{
                  text: "Save",
                  disabled: !hasUnsavedChanges || !newEmailAddressValid,
                  clickHandler: this.handleSaveClick
                },{
                  text: "Home",
                  clickHandler: () => { this.props.history.push("/"); }
                }]}/>
        {loading ? <LoadingDialog text={loading}/> : (
          <div className="content">
            <div className="contentSpacer"></div>
            <Paper className="section">
              <Typography variant="subtitle1">{emailFieldLabel}</Typography>
              <TextField value={newEmailAddress}
                         disabled={false}
                         onChange={this.handleEmailChange}
                         error={!newEmailAddressValid}
                         label="Email"
                         helperText={newEmailAddressValid ? "" : "Email format is incorrect"}
                         type="email"
                         name="email"
                         autoComplete="email"
                         margin="normal"
                         variant="outlined" />
            </Paper>
            <div>{subscriptionMap && Object.keys(subscriptionMap).join(",")}</div>
          </div>
        )}
      </>
    );
  }
}

export default Settings;
