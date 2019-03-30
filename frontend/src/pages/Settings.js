import React, { Component } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";

import * as Api from "../api";
import AppBar from "../components/AppBar";
import LoadingDialog from "../components/LoadingDialog";

class Settings extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: "Loading settings",
      email: undefined,
      subscriptionMap: undefined
    };
    this.loadSettings();
  }

  loadSettings = async () => {
    let results = await Promise.all([
      Api.getEmail(),
      Api.getSubscriptions()
    ]);
    let email = results[0];
    let subscriptionMap = results[1];
    this.setState({
      loading: undefined,
      email: email,
      subscriptionMap: subscriptionMap
    });
  };

  render() {
    const { loading, email, subscriptionMap } = this.state;
    return (
      <>
        <AppBar title="Settings"
                extraButtonText="Home"
                onExtraButtonClick={ () => { this.props.history.push("/"); } }/>
        {loading ? <LoadingDialog text={loading}/> : (
          <div className="content">
            <div className="contentSpacer"></div>
            <div>{email.address}</div>
            <div>{Object.keys(subscriptionMap).join(",")}</div>
          </div>
        )}
      </>
    );
  }
}

export default Settings;
