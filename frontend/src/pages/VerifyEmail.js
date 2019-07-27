import React, { Component } from "react";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Timeout from "await-timeout";

import Api from "../api";
import AppBar from "../components/AppBar";
import LoadingDialog from "../components/LoadingDialog";

class VerifyEmail extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: "Verifying your email",
      message: ""
    };
    
  }

  componentDidMount() {
    console.log("in VerifyEmail");
    let params = new URLSearchParams(window.location.search);
    let userID = params.get("userID");
    let verificationCode = params.get("verificationCode");
    let succeeded = (params.get("succeeded") === "true");
    if(succeeded && userID && verificationCode) {
      return this.verifyEmail(userID, verificationCode);
    }
    this.setState({
      loading: undefined,
      message: "Email verification error"
    });
  }

  verifyEmail = async (userID, verificationCode) => {
    console.log("Should verify email:");
    console.log("userID:", userID);
    console.log("verificationCode:", verificationCode);
    let message = "";
    let success = false;
    try {
      const registerEmailResponse = await Api.verifyEmail(userID, verificationCode);
      success = true;
      console.log("Success verifying email:", registerEmailResponse);
      message = "Email verification success"; 
    } catch(err) {
      console.log("Error registering email:", err);
    }
    this.setState({
      message: `Email verification ${success ? "succeeded" : "failed"}. Redirecting to login page...`,
      loading: undefined
    });
    if(success) {
      await Timeout.set(2000);
      this.props.history.replace("/login");
    }
  };

  render() {
    const { loading, message } = this.state;
    return (
      <>
        <AppBar title="Email verification"/>
        {loading && <LoadingDialog text={loading}/> }
        <div className="content">
          <div className="contentSpacer"></div>
          <Paper className="paper">
            <Typography variant="subtitle1">{message}</Typography>
          </Paper>
        </div>
      </>
    );
  }
}

export default VerifyEmail;
