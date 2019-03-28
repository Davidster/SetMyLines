import React, { Component } from "react";
import $ from "jquery";
import * as Api from "../api";

class RegisterEmail extends Component {

  constructor(props) {
    super(props);
    console.log("in RegisterEmail");
  }

  registerEmail = async () => {
    let email = $("#emailInput").val();
    console.log("Should send email: ", email);
    try {
      let registerEmailResponse = await Api.registerEmail(email);
      console.log("Success registering email:", registerEmailResponse);
    } catch(err) {
      console.log("Error registering email:", err);
    }
  };

  render() {
    return (
      <div>
        <input type="email" id="emailInput" style={{width:300}}/>
        <button onClick={this.registerEmail}>Send</button>
      </div>
    );
  }
}

export default RegisterEmail;
