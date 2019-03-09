# yahoo-fantasy-automation

Catch me livestreaming the development of this project on [Twitch](https://www.twitch.tv/dhuckz).

## TODO

- ~FIX SECURITY FLAW (see these: [1](https://auth0.com/docs/security/store-tokens), [2](https://auth0.com/docs/quickstart/webapp/nodejs/))~
- ~Verify JWT sent by client on each request. Also, check if token is expired and auto-refresh instead of exposing a /refreshToken API~
- ~Fix roster download script so it does all queries in parallel instead of 1 at a time~
- ~Figure out how to use yahoo API to update roster~
- ~Formalize problem as minimum-cost flow, then implement algorithm in polynomial time to solve it, as per this [response](https://cs.stackexchange.com/questions/104854/placing-items-into-compatible-bucket-types-to-find-an-optimal-total-value).~
- ~Create some tests to prove the performance of the bench-setting algorithm by downloading some sample lineups and optimizing them.~ Be sure to save the resulting total value of each optimized lineup to ensure that the algorithm's perfomance will not degrade over time... Will do this once unit tests time comes around.
- ~Create CloudFormation template as per this [example](https://github.com/awslabs/aws-serverless-express/tree/master/examples/basic-starter), allowing the site to be deployed completely serverless.~
- ~Clean out all code that was used to deploy the app to a VPS~
- ~Wrap maxflowmincost code into python lambda function, make sure it's callable from main express app lambda~
- ~Split getTeamRoster.js into two source files.. also clean up that code.. it is a :hankey: - show.~
- Upgrade python version in lambda to 3.x instead of 2.7
- Figure out how to run app locally
- Read up about csrf and figure out how to mitigate this issue in my use case. Cookies should be set to use "httponly" and "secure". When a user visits the website, read a csrf token from the database and send it back to the client for him to include in all write requests. Ideally this csrf token should be changed regularly, maybe once per day (maybe use dynamodb timeToLive)
- Add DynamoDB table to hold user info.
- Add CloudWatch events to perform roster updates on regular basis
- Create jscalc to estimate cost of website.
- Get Time On Ice value from official NHL API, calculate effective fan-points per 20mins of ice time
- UX design
- Create a fancy-ass frontend in React
- Clean up code.. make sure indentation is always 2 and NO DARNED SINGLE QUOTES

### Some cost estimation notes:

#### API Gateway
0$

#### Lambda
52 * 100ms of lambda execution time per page load -> 52 * 0.000001667$ -> 0.009 cents per page load

1 million page loads per month: 52 * 1000000 * 0.000001667 -> $86.684/mo

#### Route53
0.5$/mo

*DynamoDB costs will probably be the most significant...*


## Project description attempt

On a given day, a subset of the players on your fantasy team will actually have a game scheduled, that is if their team is scheduled to play on that day. Also, most fantasy leagues are set to include some bench positions (BN) as well as active positions (for the nhl, these might be C, RW, LW, D, G). You can only be awarded points for the players who are placed on an active position. Every day, the user must make sure that their active positions are filled with the maximum number of players who have a game scheduled. Actually Yahoo provides a button on the mobile app which will automatically fill the active positions on a daily or weekly basis.

The problem arises on days where you have a higher number of players with a scheduled game than total number of active positions, so you are forced to place some players in the BN position and forfeit whatever points they might score during their game. In this situation, you would want to place the players with the lowest chance of scoring points on the BN and vice versa. It is unclear as to what process the previously mentioned "fill active positions" button on the moble app uses to fill the active potiions. I stand to believe that it is picking the positions randomly, though I'm not entirely sure.

Personally, the way I solve this problem is by clicking the "fill active positions" button, and then look at the average fan points per game of each player. For the players with a relatively higher number of average fan points, I will try to swap them off my BN onto an active position.

It is also worth mentioning that each player is only able to be placed on a subset of all the possible active positions. For example, goalies can only be put in the G position and natural centermen can only be put in the C position.

Optimally, one would be able to find the roster configuration that optimizes for the total average fan points (or some other stat). The website I'm trying to build will allow people to authenticate with their Yahoo account, giving the website permission to automatically make changes to their active roster. Every morning (at ~7am or something), the site would launch a worker who would use an algorithm of my design to optimize the "value" of their active roster. Upon updating the roster, it would send an email to the user indicating the exact changes that were made to the roster, so the user stays informed as to exactly what changes the site is making to their account.

## API Investigation

https://fantasysports.yahooapis.com/fantasy/v2/league/

### Get all active nhl leagues for user:
https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;is_available=1;game_keys=nhl/leagues

### Get all active nhl leagues for user, include user's teams inside
https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;is_available=1;game_keys=nhl/leagues/teams

### Get specific league by league_key (my league_key is 386.l.119688)
https://fantasysports.yahooapis.com/fantasy/v2/leagues;league_keys=386.l.119688

### Include settings in league
https://fantasysports.yahooapis.com/fantasy/v2/leagues;league_keys=386.l.119688/settings

### Get roster for current day
https://fantasysports.yahooapis.com/fantasy/v2/team/386.l.119688.t.5/roster

### Edit roster for current day
PUT http://fantasysports.yahooapis.com/fantasy/v2/team/386.l.119688.t.5/roster
see xml data content here: https://developer.yahoo.com/fantasysports/guide/roster-resource.html#roster-resource-PUT

Example:

```
curl -X PUT https://fantasysports.yahooapis.com/fantasy/v2/team/386.l.119688.t.5/roster
-H "Authorization: Bearer xxx"
-H "Content-Type: application/xml"
-d "
<?xml version="1.0"?>
<fantasy_content>
  <roster>
    <coverage_type>date</coverage_type>
    <date>2019-02-25</date>
    <players>
      <player>
        <player_key>386.p.7109</player_key>
        <position>C</position>
      </player>
      <player>
        <player_key>386.p.4962</player_key>
        <position>BN</position>
      </player>
      <player>
        <player_key>386.p.5991</player_key>
        <position>LW</position>
      </player>
      <player>
        <player_key>386.p.5405</player_key>
        <position>BN</position>
      </player>
    </players>
  </roster>
</fantasy_content>
"
```

Response:

```
<?xml version="1.0" encoding="UTF-8"?>
<fantasy_content xml:lang="en-US" yahoo:uri="http://fantasysports.yahooapis.com/fantasy/v2/team/386.l.119688.t.5/roster" xmlns:yahoo="http://www.yahooapis.com/v1/base.rng" xmlns="http://fantasysports.yahooapis.com/fantasy/v2/base.rng">
    <confirmation>
        <status>success</status>
    </confirmation>
</fantasy_content>
<!-- fanos299.sports.bf1.yahoo.com Mon Feb 25 07:33:52 UTC 2019 -->
```
