import React, { Component } from "react";
import Avatar from "@material-ui/core/Avatar";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Tooltip from "@material-ui/core/Tooltip";
import FlipMove from "react-flip-move";

import "./RosterTable.css";

export default props => {
  const { lineup, playerInfoMap, disableRosterAnimation, aggregateStatCategories } = props;
  return (
    <Paper className="rosterTableBackground">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Position</TableCell>
            <TableCell>Player</TableCell>
            <TableCell>Is Playing Today?</TableCell>
            <TableCell>Health Status</TableCell>
            {aggregateStatCategories.map(category => (
              <Tooltip key={category.prettyName} title={category.prettyName} placement="bottom-start">
                <TableCell>{category.prettyNameShort}</TableCell>
              </Tooltip>
            ))}
          </TableRow>
        </TableHead>
        <TableBody className="tableBody">
          <FlipMove typeName={null} duration={750} disableAllAnimations={disableRosterAnimation}>
            {lineup.lineup.filter(player=>!!player.name).map((player, i) => (
              <TableRow key={player.name} className={`rosterTableItem ${player.moved ? "moved" : ""} ${player.position==="BN" ? "bench" : ""}`}>
                <TableCell>{player.position}</TableCell>
                {player.name && (
                  <>
                    <TableCell>
                      <div className="playerInfoCell">
                        <Avatar className="playerInfoImage" alt={player.name} src={playerInfoMap[player.name].imageUrl} />
                        <div className="playerInfoText">
                          <div className="name">{player.name}</div>
                          <div className="posList">{playerInfoMap[player.name].eligiblePosList.join(" ")}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`${!!playerInfoMap[player.name].todaysGame ? "green" : "red"}`}>
                      {!!playerInfoMap[player.name].todaysGame ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className={`${playerInfoMap[player.name].status ? "red" : "green"}`}>
                      {playerInfoMap[player.name].status || "Healthy"}
                    </TableCell>
                    {aggregateStatCategories.map(category => {
                      let value = playerInfoMap[player.name].aggregateStats[category.name];
                      return (value === undefined) ? <td>N/A</td> : (
                        <TableCell key={category.prettyName}>{value.toFixed(2)}</TableCell>
                      )
                    })}
                  </>
                )}
              </TableRow>
            ))}
          </FlipMove>
        </TableBody>
      </Table>
    </Paper>
  );
};
