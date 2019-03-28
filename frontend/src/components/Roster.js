import React, { Component } from "react";
import Input from "@material-ui/core/Input";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormHelperText from "@material-ui/core/FormHelperText";
import Button from "@material-ui/core/Button";
import MomentUtils from "@date-io/moment";
import { MuiPickersUtilsProvider, DatePicker } from "material-ui-pickers";

import RosterStatsPanel from "./RosterStatsPanel";
import RosterTable from "./RosterTable";

import "./Roster.css";

class RosterView extends Component {

  constructor(props) {
    super(props);
    this.state = {
      optimizationType: ""
    };
  }

  handleOptimizationTypeClick = event => {
    this.setState({
      optimizationType: event.target.value
    });
  }

  render() {
    if(!this.props.roster) {
      return null;
    }

    const { roster,
            date,
            disableRosterAnimation,
            onDateSelection,
            onApplyClick } = this.props;
    const { aggregateStatCategories,
            playerInfoMap,
            originalLineup,
            optimizedLineups } = roster;
    const { optimizationType } = this.state;
    const optimizationTypes = ["Unchanged"].concat(aggregateStatCategories.map(category=>category.prettyName));
    const chosenLineup = optimizationType === "" ? originalLineup : optimizedLineups[optimizationType];

    return (
      <div className="rosterTableContainer">
        <MuiPickersUtilsProvider utils={MomentUtils}>
          <DatePicker margin="normal"
                      label="Date"
                      helperText="Show roster for this day"
                      value={date}
                      onChange={onDateSelection}
                      className="datePicker"/>
        </MuiPickersUtilsProvider>
        <FormControl className="formControl">
          <InputLabel shrink htmlFor="optimizationTypeLabel">
            Stat
          </InputLabel>
          <Select
            value={optimizationType}
            onChange={this.handleOptimizationTypeClick}
            input={<Input name="optimizationType" id="optimizationTypeLabel"/>}
            displayEmpty
            name="optimizationType"
            className="select">
            {optimizationTypes.map(type => {
              let category = aggregateStatCategories.find(category=>category.prettyName===type);
              return <MenuItem key={type} value={category ? category.name : ""}>{type}</MenuItem>;
            })}
          </Select>
          <FormHelperText>Select stat to optimize against</FormHelperText>
        </FormControl>
        {/*<Button onClick={() => { onApplyClick(chosenLineup, playerInfoMap, date); }}>Apply</Button>*/}
        <RosterStatsPanel lineup={chosenLineup}
                          aggregateStatCategories={aggregateStatCategories}/>
        <RosterTable lineup={chosenLineup}
                     playerInfoMap={playerInfoMap}
                     disableRosterAnimation={disableRosterAnimation}
                     aggregateStatCategories={aggregateStatCategories}/>
      </div>
    );
  }
}

export default RosterView;
