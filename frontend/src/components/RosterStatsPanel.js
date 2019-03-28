import React from "react";
import Typography from "@material-ui/core/Typography";
import ExpansionPanel from "@material-ui/core/ExpansionPanel";
import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary";
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";

import "./RosterStatsPanel.css";

let formatDiffPercentage = diff => {
  if(!diff) {
    diff = 0;
  }
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
  let diffString = (diff < 10000) ? `${diff.toFixed(2)}%` : "∞";
  return <span className={`diff ${color}`}>{sign}{diffString}</span>;
};

export default props => {
  const { lineup, aggregateStatCategories } = props;
  return (
    <ExpansionPanel className="statTotalsExpansionPanel">
      <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
        <Typography className="statTotalsHeading">Roster summary</Typography>
        <Typography className="statTotalsSecHeading">
          {aggregateStatCategories.map(category => (
            `${category.prettyNameShort}: ${lineup.statTotals[category.name].total.value.toFixed(2)}`
          )).join(", ")}
        </Typography>
      </ExpansionPanelSummary>
      <ExpansionPanelDetails className="statTotalsExpansionDetails">
        {aggregateStatCategories.map((category, i) => {
          let statTotal = lineup.statTotals[category.name];
          let healthyPoints = statTotal.healthy.value;
          let healthyDiff = formatDiffPercentage(statTotal.healthy.diff);
          let unhealthyPoints = statTotal.unhealthy.value;
          let unhealthyDiff = formatDiffPercentage(statTotal.unhealthy.diff);
          let totalPoints = statTotal.total.value;
          let totalDiff = formatDiffPercentage(statTotal.total.diff);
          return (<div key={i}>
            <Typography variant="h6" gutterBottom>{category.name}: {totalPoints.toFixed(2)} ({totalDiff})</Typography>
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
};
