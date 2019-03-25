import React, { Component } from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Drawer from "@material-ui/core/Drawer";
import MenuIcon from "@material-ui/icons/Menu";
import IconButton from "@material-ui/core/IconButton";
import Divider from "@material-ui/core/Divider";
import List from "@material-ui/core/List";
import ListSubheader from "@material-ui/core/ListSubheader";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import ListItemText from "@material-ui/core/ListItemText";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Tooltip from "@material-ui/core/Tooltip";
import Input from "@material-ui/core/Input";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormHelperText from "@material-ui/core/FormHelperText";
import CssBaseline from "@material-ui/core/CssBaseline";
import moment from "moment-timezone";
import MomentUtils from "@date-io/moment";
import { MuiPickersUtilsProvider, DatePicker } from "material-ui-pickers";
import ExpansionPanel from "@material-ui/core/ExpansionPanel";
import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary";
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import LaunchIcon from "@material-ui/icons/Launch";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import FlipMove from "react-flip-move";
import $ from "jquery";
import "./Teams.css";

const CircularProgresss = props => (
  <CircularProgress {...props} thickness={props.thiccness}/>
);

const AGGREGATE_STAT_COLUMNS = [
  {
    name: "Average fan points per game",
    displayName: "AFP",
    attribName: "averageFanPoints"
  },
  {
    name: "Total fan points",
    displayName: "TFP",
    attribName: "totalFanPoints"
  }
];

const OPTIMIZATION_TYPE_MAP = {
  "Unchanged": "",
  "Average Fan Points": "averageFanPoints",
  "Total Fan Points": "totalFanPoints"
};
const OPTIMIZATION_TYPES = Object.keys(OPTIMIZATION_TYPE_MAP);

const SERVER_TIME_ZONE = "America/New_York";

class Teams extends Component {

  constructor(props) {
    super(props);
    this.teamRosters = {};
    this.state = {
      activeTeamKey: undefined,
      optimizationType: OPTIMIZATION_TYPE_MAP["Unchanged"],
      teams: [],
      roster: undefined,
      toolbarOpen: true,
      selectedDate: moment().tz(SERVER_TIME_ZONE),
      loggedIn: true,
      loading: "",
      disableRosterAnimation: false
    };
    console.log(this.state);
    this.validateToken().then(tokenValidResponse => {
      this.csrfToken = tokenValidResponse.csrfToken;
      this.setState({
        loading: "Loading your teams"
      });
      this.getTeams().then(teamsResponse => {
        console.log(teamsResponse);
        this.setState({
          teams: teamsResponse.teams,
          loading: ""
        });
      }).catch(err => {
        this.setState({
          loading: ""
        });
        window.alert("Error getting teams. Reload page to retry");
      });
    }).catch(err => {
      // TODO: check the error message and only redirect to login page if we got UNAUTHORIZED response
      console.log(err);
      this.setState({
        loggedIn: false
      });
    });
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

  getTeams = () => this.apiRequest({
    type: "GET",
    url: "/api/teams"
  });

  getTeamRoster = (teamKey, date) => this.apiRequest({
    type: "GET",
    url: `/api/teamRoster?teamKey=${teamKey}&date=${date.format("YYYY-MM-DD")}`
  });

  updateTeamRoster = (csrfToken, teamKey, roster, date) => this.apiRequest({
    type: "PUT",
    url: `/api/teamRoster?teamKey=${teamKey}&date=${date.format("YYYY-MM-DD")}`,
    headers: {
      "CSRF-Token": csrfToken
    },
    data: {
      roster: roster
    }
  });

  validateToken = () => this.apiRequest({
    type: "GET",
    url: "/api/verifyToken"
  });

  getSubscriptions = () => this.apiRequest({
    type: "GET",
    url: "/api/subscriptions"
  });

  addSubscription = (csrfToken, teamKey, stat) => this.apiRequest({
    type: "POST",
    url: `/api/subscriptions`,
    headers: {
      "CSRF-Token": csrfToken
    },
    data: {
      teamKey: teamKey,
      stat: stat
    }
  });

  deleteSubscription = (csrfToken, teamKey) => this.apiRequest({
    type: "DELETE",
    url: `/api/subscriptions`,
    headers: {
      "CSRF-Token": csrfToken
    },
    data: {
      teamKey: teamKey
    }
  });

  handleTeamClick = (teamKey) => {
    this.setState({
      disableRosterAnimation: true,
      activeTeamKey: teamKey
    });
    if(this.teamRosters[teamKey]) {
      this.setState({
        roster: this.teamRosters[teamKey]
      });
      setTimeout(() => {
        this.setState({
          disableRosterAnimation: false
        });
      }, 1000);
    } else {
      this.setState({
        loading: "Loading team roster"
      });
      this.getTeamRoster(teamKey, this.state.selectedDate).then(roster => {
        console.log("roster api result:", roster);
        this.teamRosters[teamKey] = roster;
        this.setState({
          roster: roster,
          loading: ""
        });
        setTimeout(() => {
          this.setState({
            disableRosterAnimation: false
          });
        }, 1000);
      }).catch(err => {
        this.setState({
          loading: ""
        });
        window.alert("Error getting team roster. Reload page to retry");
      });
    }
    this.getSubscriptions().then(res => {
      console.log("getSubscriptions success:", res);
      // if(!res[teamKey]) {
      //   this.addSubscription(this.csrfToken, teamKey, "averageFanPoints").then(res => {
      //     console.log("addSubscription success:", res);
      //   }).catch(err => {
      //     console.log("addSubscription error:", err);
      //   });
      // } else {
      //   this.deleteSubscription(this.csrfToken, teamKey).then(res => {
      //     console.log("deleteSubscription success:", res);
      //   }).catch(err => {
      //     console.log("deleteSubscription error:", err);
      //   });
      // }
    }).catch(err => {
      console.log("getSubscriptions error:", err);
    });

  }

  handleOptimizationTypeClick = event => {
    this.setState({
      optimizationType: event.target.value
    });
  }

  handleDateChange = date => {
    date = date.tz(SERVER_TIME_ZONE);
    this.setState({
      loading: "Loading team roster"
    });
    this.getTeamRoster(this.state.activeTeamKey, date).then(roster => {
      console.log("roster api result:", roster);
      this.teamRosters[this.state.activeTeamKey] = roster;
      this.setState({
        roster: roster,
        selectedDate: date,
        loading: ""
      });
    }).catch(err => {
      this.setState({
        loading: ""
      });
      window.alert("Error getting team roster.  Reload page to retry");
    });
  }

  handleDrawerToggle = () => {
    this.setState({ toolbarOpen: !this.state.toolbarOpen });
  };

  formatDiffPercentage = (diff) => {
    let color = "neutral";
    let sign = "";
    if(Math.round(diff * 100) > 0) {
      color = "positive";
      sign = "+";
    }
    if(Math.round(diff * 100) < 0) {
      color = "negative";
      sign = "-";
    }
    return <span className={`diff ${color}`}>{sign}{diff.toFixed(2)}%</span>;
  };

  handleApply = (lineup, playerInfoMap, date) => {
    let roster = lineup.map(player => ({
      playerKey: playerInfoMap[player.name].key,
      position: player.position
    }));
    console.log("should call PUT /api/teamRoster with:", this.state.activeTeamKey, roster);
    this.updateTeamRoster(this.csrfToken, this.state.activeTeamKey, roster, date).then(res => {
      console.log("updateTeamRoster success", res);
    }).catch(err => {
      console.log("updateTeamRoster error", err);
    });
  };

  renderRosterList = (lineup, playerInfoMap, statIDMap, date) => {
    return (
      <>
        <MuiPickersUtilsProvider utils={MomentUtils}>
          <DatePicker margin="normal"
                      label="Date"
                      helperText="Show roster for this day"
                      value={date}
                      onChange={this.handleDateChange}
                      className="datePicker"/>
        </MuiPickersUtilsProvider>
        <FormControl className="formControl">
          <InputLabel shrink htmlFor="optimization-type-label-placeholder">
            Stat
          </InputLabel>
          <Select
            value={this.state.optimizationType}
            onChange={this.handleOptimizationTypeClick}
            input={<Input name="optimizationType" id="optimization-type-label-placeholder"/>}
            displayEmpty
            name="optimizationType"
            className="select">
            {OPTIMIZATION_TYPES.map(type => (
              <MenuItem key={type} value={OPTIMIZATION_TYPE_MAP[type]}>{type}</MenuItem>
            ))}
          </Select>
          <FormHelperText>Select stat to optimize against</FormHelperText>
        </FormControl>
        <Button onClick={() => { this.handleApply(lineup, playerInfoMap, date); }}>Apply</Button>
        {this.renderRosterStatTotals(lineup, playerInfoMap)}
        <Paper className="rosterTableBackground">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Position</TableCell>
                <TableCell>Player</TableCell>
                {AGGREGATE_STAT_COLUMNS.map(column => (
                  <Tooltip key={column.name} title={column.name} placement="bottom-start">
                    <TableCell>{column.displayName}</TableCell>
                  </Tooltip>
                ))}
                <TableCell>Is Playing Today?</TableCell>
                <TableCell>Health Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody className="tableBody">
              <FlipMove typeName={null} duration={750} disableAllAnimations={this.state.disableRosterAnimation}>
                {lineup.filter(player=>!!player.name).map((player, i) => (
                  <TableRow key={player.name} className={`rosterTableItem ${player.moved ? "moved" : ""} ${player.position==="BN" ? "bench" : ""}`}>
                    <TableCell>{player.position}</TableCell>
                    {player.name && (
                      <>
                        <TableCell className="playerInfoCell">
                          <div className="playerInfoCellSub">
                            <Avatar className="playerInfoImage" alt={player.name} src={playerInfoMap[player.name].imageUrl} />
                            <div className="playerInfoText">
                              <div className="name">{player.name}</div>
                              <div className="posList">{playerInfoMap[player.name].eligiblePosList.join(" ")}</div>
                            </div>
                          </div>
                        </TableCell>
                        {AGGREGATE_STAT_COLUMNS.map(column => {
                          let value = playerInfoMap[player.name].aggregateStats[column.attribName];
                          return (value === undefined) ? <td>N/A</td> : (
                            <TableCell key={column.name}>{value.toFixed(2)}</TableCell>
                          )
                        })}
                        <TableCell className={`${!!playerInfoMap[player.name].todaysGame ? "green" : "red"}`}>
                          {!!playerInfoMap[player.name].todaysGame ? "Yes" : "No"}
                        </TableCell>
                        <TableCell className={`${playerInfoMap[player.name].status ? "red" : "green"}`}>
                          {playerInfoMap[player.name].status || "Healthy"}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </FlipMove>
            </TableBody>
          </Table>
        </Paper>
      </>
    );
  }

  renderRosterStatTotals = (lineup, playerInfoMap) => {
    let statTotals = { original: {}, optimized: {} };
    AGGREGATE_STAT_COLUMNS.forEach(column => {
      let emptyStructure = () => ({
        healthy: { value: 0 },
        unhealthy: { value: 0 }
      });
      statTotals.original[column.name] = emptyStructure();
      statTotals.optimized[column.name] = emptyStructure();
    });
    lineup.forEach(player => {
      let playerInfo = playerInfoMap[player.name];
      if(playerInfo && player.position !== "BN" && !!playerInfo.todaysGame) {
        let isHealthy = !!playerInfo.status ? "unhealthy" : "healthy";
        AGGREGATE_STAT_COLUMNS.forEach(column => {
          statTotals.optimized[column.name][isHealthy].value += playerInfo.aggregateStats[column.attribName];
        });
      }
    });
    this.state.roster.originalLineup.forEach(player => {
      let playerInfo = playerInfoMap[player.name];
      if(playerInfo && player.position !== "BN" && !!playerInfo.todaysGame) {
        let isHealthy = !!playerInfo.status ? "unhealthy" : "healthy";
        AGGREGATE_STAT_COLUMNS.forEach(column => {
          statTotals.original[column.name][isHealthy].value += playerInfo.aggregateStats[column.attribName];
        });
      }
    });
    AGGREGATE_STAT_COLUMNS.forEach(column => {
      let healthyOrig = statTotals.original[column.name].healthy.value;
      let unhealthyOrig = statTotals.original[column.name].unhealthy.value;
      let totalOrig = healthyOrig + unhealthyOrig;
      let unhealthyOpt = statTotals.optimized[column.name].unhealthy.value;
      let healthyOpt = statTotals.optimized[column.name].healthy.value;
      let totalOpt = unhealthyOpt + healthyOpt;
      statTotals.optimized[column.name].healthy.diff = 100 * (healthyOpt - healthyOrig) / (healthyOrig + 0.0001);
      statTotals.optimized[column.name].unhealthy.diff = 100 * (unhealthyOpt - unhealthyOrig) / (unhealthyOrig + 0.0001);
      statTotals.optimized[column.name].total = {
        value: totalOpt,
        diff: 100 * (totalOpt - totalOrig) / (totalOrig + 0.0001)
      };
    });

    return (
      <ExpansionPanel className="statTotalsExpansionPanel">
        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
          <Typography className="statTotalsHeading">Roster summary</Typography>
          <Typography className="statTotalsSecHeading">
            {AGGREGATE_STAT_COLUMNS.map(column => (
              `${column.displayName}: ${statTotals.optimized[column.name].total.value.toFixed(2)}`
            )).join(", ")}
          </Typography>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails className="statTotalsExpansionDetails">
          {AGGREGATE_STAT_COLUMNS.map((column, i) => {
            let healthyPoints = statTotals.optimized[column.name].healthy.value;
            let healthyDiff = this.formatDiffPercentage(statTotals.optimized[column.name].healthy.diff);
            let unhealthyPoints = statTotals.optimized[column.name].unhealthy.value;
            let unhealthyDiff = this.formatDiffPercentage(statTotals.optimized[column.name].unhealthy.diff);
            let totalPoints = statTotals.optimized[column.name].total.value;
            let totalDiff = this.formatDiffPercentage(statTotals.optimized[column.name].total.diff);
            return (<div key={i}>
              <Typography variant="h6" gutterBottom>{column.name}: {totalPoints.toFixed(2)} ({totalDiff})</Typography>
              <Typography gutterBottom>
                - {healthyPoints.toFixed(2)} ({healthyDiff}) from healthy players
              </Typography>
              <Typography gutterBottom>
                - {unhealthyPoints.toFixed(2)} ({unhealthyDiff}) from unhealthy players
              </Typography>
            </div>);
          })}
        </ExpansionPanelDetails>
      </ExpansionPanel>
    );
  }

  renderLoginDialog = () => {
    return (
      <Dialog open={true} aria-labelledby="form-dialog-title">
        <DialogTitle id="form-dialog-title">Welcome</DialogTitle>
        <DialogContent>
          <DialogContentText>
            In order for setmylines.com to work, you must first sign into your Yahoo account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={()=>{ window.location.href = "/api/login"; }}>
            Sign into Yahoo
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  renderLoadingDialog = text => {
    return (
      <Dialog open={true} aria-labelledby="form-dialog-title" className="loadingDialog">
        <DialogTitle className="title" id="form-dialog-title">{text}</DialogTitle>
        <DialogContent className="progress">
          <CircularProgresss size={200} thiccness={2.4}/>
        </DialogContent>
      </Dialog>
    );
  }

  render() {
    let { loggedIn, activeTeamKey, teams, roster, optimizationType, toolbarOpen, selectedDate, loading } = this.state;
    let selectedTeamName = teams.length > 0 && activeTeamKey && teams.filter(team=>team.teamKey===activeTeamKey)[0].teamName;
    if(!loggedIn) {
      return this.renderLoginDialog();
    }
    return (
      <div className="root">
        <CssBaseline />
        <AppBar position="fixed" color="primary" className={`appBar ${toolbarOpen ? "shift" : ""}`}>
          <Toolbar disableGutters={toolbarOpen} className="toolbar">
            <IconButton
              color="inherit"
              aria-label="Open drawer"
              onClick={this.handleDrawerToggle}
              className={`menuButton`}>
              <MenuIcon />
            </IconButton>
            <Typography className="appBarTitle" variant="h6" color="inherit" noWrap>
              {selectedTeamName ? selectedTeamName : "Select a team"}
            </Typography>
            <Button className="logoutButton" color="inherit" onClick={() => { window.location.href = "/api/logout"; }}>Logout</Button>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          className={`drawer ${toolbarOpen ? "open" : "close"}`}
          classes={{paper: `paper ${toolbarOpen ? "open" : "close"}`}}
          open={toolbarOpen}>
          <div className="drawerHead"></div>
          <List subheader={<ListSubheader component="div">Teams</ListSubheader>}>
            {teams.map((team, i) => (
              <ListItem button key={i} alignItems="flex-start" onClick={() => { this.handleTeamClick(team.teamKey); }}>
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
                  className={`teamLinkButton`}>
                  <LaunchIcon />
                </IconButton>
              </ListItem>
            ))}
          </List>
          {/*<Divider /> --  can use this thing to separate by sport? */}
        </Drawer>
        {loading && this.renderLoadingDialog(loading)}
        <div className={`content ${toolbarOpen ? "shift" : ""}`}>
          <div className="contentSpacer"></div>
          <div className="rosterTableContainer">
            {teams.length > 0 && !!activeTeamKey && !!this.teamRosters[activeTeamKey] && (
              this.renderRosterList(
                (!optimizationType ? roster.originalLineup : roster.optimizedLineups[optimizationType]),
                roster.playerInfoMap,
                roster.statIDMap,
                selectedDate
              )
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default Teams;
