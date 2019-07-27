import React, { Component } from "react";
import $ from "jquery";
import Api from "../api";

class UnsubscribeEmail extends Component {

  constructor(props) {
    super(props);
    this.state = {
      msg: ""
    };
    console.log("in UnsibscribeEmail");
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

  unsubscribeEmail = async () => {
    let params = new URLSearchParams(window.location.search);
    let userID = params.get("userID");
    let emailAddress = params.get("emailAddress");
    let verificationCode = params.get("verificationCode");
    this.setState({
      msg: "Removing email subscription"
    });
    console.log("Should unsubscribe email: ");
    console.log("userID:", userID);
    console.log("verificationCode:", verificationCode);
    console.log("emailAddress:", emailAddress);
    try {
      let unsubscribeEmailResponse = await this.apiRequest({
        type: "POST",
        url: `/api/email/enable`,
        data: {
          userID: userID,
          verificationCode: verificationCode,
          enable: false
        }
      });
      console.log("Success unsubscribing email:", unsubscribeEmailResponse);
      this.setState({
        msg: "Subscription removal success"
      });
    } catch(err) {
      this.setState({
        msg: "Subscription removal error"
      });
      console.log("Error unsubscribing email:", err);
    }
  };

  render() {
    return (
      <div>
        <button onClick={this.unsubscribeEmail}>Unsubscribe</button>
        {this.state.msg}
      </div>
    );
  }
}

export default UnsubscribeEmail;
