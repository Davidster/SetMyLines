import React, { Component } from "react";
import CssBaseline from "@material-ui/core/CssBaseline";
import moment from "moment-timezone";
import { Redirect } from "react-router-dom";

import AppBar from "../components/AppBar";
import TeamsDrawer from "../components/TeamsDrawer";
import Roster from "../components/Roster";
import LoadingDialog from "../components/LoadingDialog";
import Api from "../api";

import "./MainPage.css";

const SERVER_TIME_ZONE = "America/New_York";

class MainPage extends Component {

  constructor(props) {
    super(props);
    this.cachedRosters = {};
    this.state = {
      activeTeamKey: undefined,
      teams: [],
      roster: undefined,
      toolbarOpen: true,
      loading: "Loading your teams",
      disableRosterAnimation: false,
      selectedDate: moment().tz(SERVER_TIME_ZONE)
    };
    Api.getTeams().then(teamsResponse => {
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
  }

  loadTeamRoster = async (teamKey, date) => {
    this.setState({
      loading: "Loading team roster"
    });
    if(!date) {
      date = moment().tz(SERVER_TIME_ZONE);
    }
    try {
      const teamKeyWithDate = `${date.format("YYYY-MM-DD")}-${teamKey}`;
      const cachedRoster = this.cachedRosters[teamKeyWithDate];
      let roster;
      if(cachedRoster) {
        roster = this.cachedRosters[teamKeyWithDate];
      } else {
        roster = await Api.getTeamRoster(teamKey, date);
        console.log("roster api result:", roster);
        this.cachedRosters[teamKeyWithDate] = roster;
      }
      this.setState({
        roster: roster,
        selectedDate: date,
        loading: ""
      });
    } catch(err) {
      this.setState({
        loading: ""
      });
      console.log("Error loading roster: ", err);
    }
  };

  handleTeamClick = (teamKey) => {
    this.setState({
      disableRosterAnimation: true,
      activeTeamKey: teamKey
    });
    this.loadTeamRoster(teamKey, this.state.selectedDate).then(() => {
      setTimeout(() => {
        this.setState({
          disableRosterAnimation: false
        });
      }, 1000);
    });
    // Api.getSubscriptions().then(res => {
    //   console.log("getSubscriptions success:", res);
    //   if(!res[teamKey]) {
    //     Api.addSubscription(teamKey, "averageFanPoints").then(res => {
    //       console.log("addSubscription success:", res);
    //     }).catch(err => {
    //       console.log("addSubscription error:", err);
    //     });
    //   } else {
    //     Api.deleteSubscription(teamKey).then(res => {
    //       console.log("deleteSubscription success:", res);
    //     }).catch(err => {
    //       console.log("deleteSubscription error:", err);
    //     });
    //   }
    // }).catch(err => {
    //   console.log("getSubscriptions error:", err);
    // });
  }

  handleDateChange = date => {
    date = date.tz(SERVER_TIME_ZONE);
    this.loadTeamRoster(this.state.activeTeamKey, date);
  }

  handleDrawerToggle = () => {
    this.setState({ toolbarOpen: !this.state.toolbarOpen });
  };

  handleApply = (lineup, playerInfoMap, date) => {
    lineup = lineup.lineup.map(player => ({
      playerKey: playerInfoMap[player.name].key,
      position: player.position
    }));
    console.log("should call PUT /api/teamRoster with:", this.state.activeTeamKey, lineup);
    Api.updateTeamRoster(this.state.activeTeamKey, lineup, date).then(res => {
      console.log("updateTeamRoster success", res);
    }).catch(err => {
      console.log("updateTeamRoster error", err);
    });
  };

  render() {
    let { activeTeamKey, teams, roster, toolbarOpen, selectedDate, loading, disableRosterAnimation } = this.state;
    let selectedTeamName = teams.length > 0 && activeTeamKey && teams.filter(team=>team.teamKey===activeTeamKey)[0].teamName;
    return (
      <>
        <CssBaseline />
        <AppBar title={selectedTeamName ? selectedTeamName : "Select a team"}
                additionalButtons={[{
                  text: "Settings",
                  clickHandler: () => { this.props.history.push("/settings"); }
                }]}
                onHamburgerClick={this.handleDrawerToggle}/>
        <TeamsDrawer teams={teams} open={toolbarOpen} onTeamClick={this.handleTeamClick} activeTeamKey={activeTeamKey}/>
        <div className={`content ${toolbarOpen ? "shift" : "unshift"}`}>
          <div className="contentSpacer"></div>
          <Roster roster={roster}
                  date={selectedDate}
                  onDateSelection={this.handleDateChange}
                  onApplyClick={this.handleApply}
                  disableRosterAnimation={disableRosterAnimation}/>
        </div>
        <LoadingDialog text={loading}/>
      </>
    );
  }
}

export default MainPage;
