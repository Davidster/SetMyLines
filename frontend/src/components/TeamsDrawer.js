import React from "react";
import Typography from "@material-ui/core/Typography";
import Drawer from "@material-ui/core/Drawer";
import IconButton from "@material-ui/core/IconButton";
import Avatar from "@material-ui/core/Avatar";
import List from "@material-ui/core/List";
import ListSubheader from "@material-ui/core/ListSubheader";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import Tooltip from "@material-ui/core/Tooltip";
import LaunchIcon from "@material-ui/icons/Launch";

import "./TeamsDrawer.css";

const renderTeamItem = (team, props) => (
  <ListItem className={`teamListItem 
                      ${team.isSupported ? "" : "disabled"} 
                      ${team.teamKey === props.activeTeamKey ? "selected" : ""}`}
            button={team.isSupported}
            alignItems="flex-start" 
            onClick={() => { team.isSupported && props.onTeamClick(team.teamKey); }}>
    <ListItemAvatar className="teamListItemAvatar">
      <Avatar alt={team.teamName} src={team.teamLogoUrl} />
    </ListItemAvatar>
    <ListItemText className="teamListItemText"
                  primary={team.teamName}
                  secondary={
                    <Typography variant="body1" color="textPrimary">
                      {team.leagueName}
                      <span className="leagueYearText">{` — ${team.leagueYear}`}</span>
                    </Typography>
                  }
    />
    <IconButton color="inherit"
                aria-label="Open Yahoo Team Page"
                onClick={e => { e.stopPropagation(); window.open(team.teamUrl, "_blank"); }}
                className="teamLinkButton">
      <LaunchIcon />
    </IconButton>
  </ListItem>
);

export default props => (
  <Drawer variant="permanent"
          className={`drawer ${props.open ? "open" : "close"}`}
          classes={{paper: `paper ${props.open ? "open" : "close"}`}}
          open={props.open}>
    <div className="drawerHead"></div>
    <List subheader={<ListSubheader component="div">Teams</ListSubheader>}>
      {props.teams.map((team, i) => (
        <React.Fragment key={i}>
          {team.isSupported ? 
            renderTeamItem(team, props) 
            :
            <Tooltip title="Team is not supported due to its league's settings" placement="right">
              {renderTeamItem(team, props)}
            </Tooltip>
          }
        </React.Fragment>
      ))}
    </List>
    {/*<Divider /> --  can use this thing to separate by sport? */}
  </Drawer>
);
