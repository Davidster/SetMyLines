import React, { Component } from "react";
import $ from "jquery";
import * as Api from "../api";

class VerifyEmail extends Component {

  constructor(props) {
    super(props);
    this.state = {
      msg: "Verifying email"
    };
    console.log("in VerifyEmail");
    let params = new URLSearchParams(this.props.location.search);
    let userID = params.get("userID");
    let verificationCode = params.get("verificationCode");
    let succeeded = params.get("succeeded");
    if(succeeded && userID && verificationCode) {
      this.verifyEmail(userID, verificationCode);
    } else {
      this.state.msg = "Email verification error";
    }
  }

  apiRequest = (options) => {
    return new Promise((resolve, reject) => {
      $.ajax(options).done((data) => {
        resolve(data);
      }).catch((err) => {
        console.log("request error", err);
        reject(err);
      });
    });
  };

  verifyEmail = async (userID, verificationCode) => {
    console.log("Should verify email: ");
    console.log("userID:", userID);
    console.log("verificationCode:", verificationCode);
    try {
      let registerEmailResponse = await this.apiRequest({
        type: "POST",
        url: `/api/email/verify`,
        data: {
          userID: userID,
          verificationCode: verificationCode
        }
      });
      console.log("Success verifying email:", registerEmailResponse);
      this.setState({
        msg: "Email verification success"
      });
    } catch(err) {
      this.setState({
        msg: "Email verification error"
      });
      console.log("Error registering email:", err);
    }
  };

  render() {
    return (
      <div>
        {this.state.msg}
      </div>
    );
  }
}

export default VerifyEmail;
