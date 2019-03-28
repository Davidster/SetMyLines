import React from "react";
import Typography from "@material-ui/core/Typography";
import Drawer from "@material-ui/core/Drawer";
import IconButton from "@material-ui/core/IconButton";
import Divider from "@material-ui/core/Divider";
import Avatar from "@material-ui/core/Avatar";
import List from "@material-ui/core/List";
import ListSubheader from "@material-ui/core/ListSubheader";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import LaunchIcon from "@material-ui/icons/Launch";

import * as Api from "../api";

import "./TeamsDrawer.css";

export default props => (
  <Drawer variant="permanent"
          className={`drawer ${props.open ? "open" : "close"}`}
          classes={{paper: `paper ${props.open ? "open" : "close"}`}}
          open={props.open}>
    <div className="drawerHead"></div>
    <List subheader={<ListSubheader component="div">Teams</ListSubheader>}>
      {props.teams.map((team, i) => (
        <ListItem button key={i} alignItems="flex-start" onClick={() => { props.onTeamClick(team.teamKey); }}>
          <ListItemAvatar>
            <Avatar alt={team.teamName} src={team.teamLogoUrl} />
          </ListItemAvatar>
          <ListItemText
            className="teamListItemText"
            primary={team.teamName}
            secondary={
              <Typography color="textPrimary">
                {team.leagueName}
                <span className="leagueYearText">{` — ${team.leagueYear}`}</span>
              </Typography>
            }
          />
          <IconButton
            color="inherit"
            aria-label="Open Yahoo Team Page"
            onClick={e => { e.stopPropagation(); window.open(team.teamUrl, "_blank"); }}
            className="teamLinkButton">
            <LaunchIcon />
          </IconButton>
        </ListItem>
      ))}
    </List>
    {/*<Divider /> --  can use this thing to separate by sport? */}
  </Drawer>
);
