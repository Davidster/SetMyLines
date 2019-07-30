const AWS = require("aws-sdk");
const rateLimit = require("function-rate-limit");
const { URL } = require("url");
const ses = new AWS.SES({ apiVersion: "2010-12-01", region: "us-east-1" });

// http://localhost:3000/verifyEmail?userID=45IPHYEJLPZJF6TIZYNXBIG4NU&verificationCode=77f6e198-6061-42bf-b215-df0317c597c1&succeeded=true

const VERIFICATION_TEMPLATE_NAME = `${process.env.CF_STACK_NAME}-VerificationEmail`;
const VERIFICATION_REDIRECT_URL = "https://setmylines.com/verifyEmail";

// NOTE: in order to update this template, the cloudformation resource (CustomEmailVerification) should be updated
// This can be triggered by updating the value of any of properties on the resource
const VERIFICATION_TEMPLATE_PARAMS = {
  TemplateName: VERIFICATION_TEMPLATE_NAME,
  SuccessRedirectionURL: new URL(`${VERIFICATION_REDIRECT_URL}?succeeded=true`).href,
  FailureRedirectionURL: new URL(`${VERIFICATION_REDIRECT_URL}?succeeded=false`).href,
  FromEmailAddress: "noreply@setmylines.com",
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

const isEmailAddressVerified = async emailAddress => {
  const { 
    VerificationAttributes: { 
      [emailAddress]: verificationAttributes
    } 
  } = await ses.getIdentityVerificationAttributes({ Identities: [emailAddress] }).promise();
  if(!verificationAttributes) {
    return false;
  }
  return verificationAttributes.VerificationStatus === "Success";
};

const createVerificationTemplate = () => (
  ses.createCustomVerificationEmailTemplate(VERIFICATION_TEMPLATE_PARAMS).promise()
);

const updateVerificationTemplate = () => (
  ses.updateCustomVerificationEmailTemplate(VERIFICATION_TEMPLATE_PARAMS).promise()
);

const deleteVerificationTemplate = () => (
  ses.deleteCustomVerificationEmailTemplate({ TemplateName: VERIFICATION_TEMPLATE_NAME }).promise()
);

const emailVerificationLink = (emailAddress) => (
  ses.sendCustomVerificationEmail({
    EmailAddress: emailAddress,
    TemplateName: VERIFICATION_TEMPLATE_NAME
  }).promise()
);

// TODO: add exponential-delayed retry
const sendEmailNotifications = async (allUserRosterUpdateResults) => {
  try {
    let emailSendResults = await Promise.all(allUserRosterUpdateResults.filter(userRosterUpdateResults=>
      userRosterUpdateResults.user.email &&
      userRosterUpdateResults.user.email.isEnabled &&
      userRosterUpdateResults.user.email.isVerified
    ).map(
      userRosterUpdateResults=>sendEmailNotification(userRosterUpdateResults)
    ));
    console.log("emailSendResults:", emailSendResults);
  } catch(err) {
    console.log("error sending emails:", err);
  }
};

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
  return ses.sendEmail(params).promise();
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
module.exports.createVerificationTemplate = createVerificationTemplate;
module.exports.updateVerificationTemplate = updateVerificationTemplate;
module.exports.deleteVerificationTemplate = deleteVerificationTemplate;
module.exports.isEmailAddressVerified = isEmailAddressVerified;