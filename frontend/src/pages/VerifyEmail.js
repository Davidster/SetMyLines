import React, { Component } from "react";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Timeout from "await-timeout";

import AppBar from "../components/AppBar";
import LoadingDialog from "../components/LoadingDialog";

class VerifyEmail extends Component {

  constructor(props) {
    super(props);
    this.state = { message: "" };
  }

  componentDidMount() {
    let params = new URLSearchParams(window.location.search);
    let succeeded = (params.get("succeeded") === "true");
    this.setState({
      message: `Email verification ${succeeded ? "succeeded!" : "failed..."} Redirecting to login page...`
    });
    this.redirectToLogin();
  }

  redirectToLogin = async () => {
    await Timeout.set(2000);
    this.props.history.replace("/login");
  }

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
