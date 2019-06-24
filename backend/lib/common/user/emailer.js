const AWS = require("aws-sdk");
const rateLimit = require("function-rate-limit");
const ses = new AWS.SES({ apiVersion: "2010-12-01", region: "us-east-1" });
const VERIFICATION_TEMPLATE_NAME = "SetMyLinesVerificationEmail";

// https://localhost:3000/verifyEmail?userID=45IPHYEJLPZJF6TIZYNXBIG4NU&verificationCode=6b01225c-729f-48ec-b2df-217f13199225

const createVerificationTemplate = (userID, verificationCode) => {
  const baseUrl = `https://setmylines.com/verifyEmail?userID=${userID}&verificationCode=${verificationCode}`
  const successUrl = new URL(`${baseUrl}&succeeded=true`).href;
  const failureUrl = new URL(`${baseUrl}&succeeded=false`).href;
  const params = {
    SuccessRedirectionURL: successUrl,
    FailureRedirectionURL: failureUrl,
    FromEmailAddress: "noreply@setmylines.com",
    TemplateName: VERIFICATION_TEMPLATE_NAME,
    TemplateSubject: "Set My Lines email verification",
    TemplateContent: `
      <html>
        <head></head>
        <body style="font-family:sans-serif;">
          <p>Dear new user,</p>
          </br>
          <p>Thank you for subscribing to Set My Lines!</p>
          <p>Please visit the following link to verify your email address:</p>
        </body>
      </html>`
  };
  return new Promise((resolve, reject) => {
    ses.updateCustomVerificationEmailTemplate(params, function(err, data) {
      if(err) { return reject(err); }
      resolve(data);
    });
  });
};

const sendVerificationEmail = (emailAddress) => {
  const params = {
    EmailAddress: emailAddress,
    TemplateName: VERIFICATION_TEMPLATE_NAME
  };
  return new Promise((resolve, reject) => {
    ses.sendCustomVerificationEmail(params, function(err, data) {
      if(err) { return reject(err); }
      resolve(data);
    });
  });
};

const emailVerificationLink = async (emailAddress, userID, verificationCode) => {
  console.log(`should send link with ${userID} and ${verificationCode} to ${emailAddress}`);
  try {
    let tempalteUpdateResponse = await createVerificationTemplate(userID, verificationCode);
    let verficationSendResponse = await sendVerificationEmail(emailAddress);
  } catch(err) {
    console.log("error sending verification email");
  }
};

// TODO: add exponential-delayed retry
const sendEmailNotifications = async (allUserRosterUpdateResults) => {
  try {
    let emaiSendResults = await Promise.all(allUserRosterUpdateResults.filter(userRosterUpdateResults=>
      userRosterUpdateResults.user.email &&
      userRosterUpdateResults.user.email.isEnabled &&
      userRosterUpdateResults.user.email.isVerified
    ).map(
      userRosterUpdateResults=>sendEmailNotificationPromise(userRosterUpdateResults)
    ));
    console.log("emaiSendResults:", emaiSendResults);
  } catch(err) {
    console.log("error sending emails:", err);
  }
};

const sendEmailNotificationPromise = (userRosterUpdateResults) => {
  return new Promise((resolve, reject) => {
    sendEmailNotification(userRosterUpdateResults, (err, data) => {
      if (err) { return reject(err); }
      resolve(data);
    });
  });
}

const sendEmailNotification = rateLimit(1, 3000, (userRosterUpdateResults, cb) => {
  const { user, rosterUpdateResults, teams } = userRosterUpdateResults;
  const teamUpdateReports = Object.keys(rosterUpdateResults).map(teamKey => {
    if(!rosterUpdateResults[teamKey]) {
      return {
        team: teams.find(team=>team.teamKey===teamKey),
        error: true
      };
    }
    const { before, after, stat, playerInfoMap, aggregateStatCategories } = rosterUpdateResults[teamKey];
    let movedPlayers = after.lineup.filter(player=>player.moved);
    movedPlayers = movedPlayers.filter(player=>player.position!=="BN").concat(movedPlayers.filter(player=>player.position==="BN"))
    movedPlayers.forEach(player => {
      player.oldPosition = before.lineup.find(playerB=>playerB.name===player.name).position;
    });
    return {
      team: teams.find(team=>team.teamKey===teamKey),
      chosenStat: aggregateStatCategories.find(category=>category.name===stat),
      playerInfoMap: playerInfoMap,
      movedPlayers: movedPlayers,
      statTotals: {
        before: before.statTotals[stat],
        after: after.statTotals[stat]
      }
    };
  });
  console.log(teamUpdateReports);
  const inline = `style="display: inline-block;"`;
  const imgDivStyle =  `display: inline-block;
                        height: 56px;
                        width: 56px;
                        padding: 4px 10px 16px 10px;
                        border-radius: 50%;
                        text-align: center;`;
  const htmlBody = `<html>
    <head></head>
    <body>
      <p>Hello Set My Lines user ${user.userID},</p>
      </br>
      <p>Below are the changes that were made to your Yahoo Fantasy account this morning:</p>
      ${teamUpdateReports.map(teamUpdateReport => `
        <h3 ${inline}>${teamUpdateReport.team.teamName}</h3>
        <h4 ${inline}>from ${teamUpdateReport.team.leagueName}</h4>
        <br>
        ${!teamUpdateReport.error ? (
            teamUpdateReport.movedPlayers.length === 0 ?
            `<p>No changes were made since the lineup was already in an optimal state</p>` :
            (teamUpdateReport.movedPlayers.map(player => `
              <div style="${imgDivStyle} background-color: ${player.position==="BN" ? "rgba(229, 57, 53, 0.67)" : "rgba(67, 160, 71, 0.67)"}">
                <img ${inline} src="${teamUpdateReport.playerInfoMap[player.name].imageUrl}"/>
              </div>
              <p ${inline}>${player.name} was moved from ${formatPositionText(player.oldPosition)} to ${formatPositionText(player.position)}</p>
            `).join("<br>\n") +
            `<p>Total ${teamUpdateReport.chosenStat.prettyName} went from ${teamUpdateReport.statTotals.before.total.value.toFixed(2)} to ${teamUpdateReport.statTotals.after.total.value.toFixed(2)} (${formatDiffPercentage(teamUpdateReport.statTotals.after.healthy.diff)})</p>` +
            `<p>  - ${teamUpdateReport.statTotals.after.healthy.value.toFixed(2)} (${formatDiffPercentage(teamUpdateReport.statTotals.after.healthy.diff)}) from healthy players</p>` +
            `<p>  - ${teamUpdateReport.statTotals.after.unhealthy.value.toFixed(2)} (${formatDiffPercentage(teamUpdateReport.statTotals.after.unhealthy.diff)}) from unhealthy players</p>`
            )
        ) : `<p>An error occurred while optimizing this lineup</p>` }
      `).join("\n")}
      <br>
      <p>---</p>
      <br>
      <p>Thank you for using Set My Lines! If you wish to unsubscribe at any time, please visit the following link:</p>
      <p>${new URL(`https://setmylines.com/unsubscribeEmail?userID=${user.userID}&verificationCode=${user.email.verificationCode}`).href}</p>
    </body>
  </html>`;
  const params = {
    Destination: {
      ToAddresses: [ user.email.address ],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: htmlBody
        }
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Set My Lines Daily Report"
      }
    },
    Source: "noreply@setmylines.com"
  };
  ses.sendEmail(params, (err, data) => {
    if (err) { return cb(err); }
    cb(undefined, data);
  });
});

let formatPositionText = position => {
  let color = "#43a047" // green
  if(position === "BN") {
    color = "#e53935"; // red
  }
  return `<span style="color: ${color}">${position}</span>`;
}

let formatDiffPercentage = diff => {
  if(!diff) {
    diff = 0;
  }
  let sign = "";
  if(Math.round(diff * 100) > 0) {
    sign = "+";
  }
  if(Math.round(diff * 100) < 0) {
    sign = "-";
  }
  return (diff < 10000) ? `${sign}${diff.toFixed(2)}%` : "∞";
};

module.exports.emailVerificationLink = emailVerificationLink;
module.exports.sendEmailNotifications = sendEmailNotifications;
