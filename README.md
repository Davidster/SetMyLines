# yahoo-fantasy-automation

## TODO

- Figure out how to update roster
- Get Time On Ice value from official NHL API, calculate effective fan-points per 20mins of ice time
- UX design

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
