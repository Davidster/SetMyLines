import React from "react";
import Typography from "@material-ui/core/Typography";
import MuiAppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import MenuIcon from "@material-ui/icons/Menu";
import Button from "@material-ui/core/Button";
import { withRouter } from "react-router";
import Api from "../api";

import "./AppBar.css";

export default withRouter(props => (
  <MuiAppBar position="fixed" color="primary" className="appBar">
    <Toolbar className="toolbar">
      {props.onHamburgerClick &&
        <IconButton color="inherit" aria-label="Open drawer" onClick={props.onHamburgerClick} className="menuButton">
          <MenuIcon />
        </IconButton>
      }
      <Typography className="appBarTitle" variant="h6" color="inherit" noWrap>
        {props.title}
      </Typography>
      {props.additionalButtons && props.additionalButtons.map(({ text, clickHandler, disabled }) => (
        <Button className="appBarButton" 
                color="inherit" 
                onClick={clickHandler} 
                key={text} 
                disabled={disabled}>
          {text}
        </Button>
      ))}
      {/* {props.extraButtonText &&
        <Button className="appBarButton" color="inherit" onClick={props.onExtraButtonClick}>{props.extraButtonText}</Button>
      } */}
      <Button className="appBarButton" color="inherit" onClick={async () => {
        await Api.logout();
        props.history.push("/login");
      }}>Logout</Button>
    </Toolbar>
  </MuiAppBar>
));
