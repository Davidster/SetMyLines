let replaceAll = (str, find, replace) => {
  return str.replace(new RegExp(find, "g"), replace);
};

module.exports = (roster, date) => {
  let requestBody = `<?xml version="1.0"?>
    <fantasy_content>
      <roster>
        <coverage_type>date</coverage_type>
        <date>${date}</date>
        <players>
          ${roster.map(player => (`
            <player>
              <player_key>${player.playerKey}</player_key>
              <position>${player.position}</position>
            </player>
          `)).join("")}
        </players>
      </roster>
    </fantasy_content>`;
  return replaceAll(requestBody, "\n", "");
};
