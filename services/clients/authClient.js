const { AuthenticationClient, Scopes } = require("@aps_sdk/authentication");
const { APS_CLIENT_ID, APS_CLIENT_SECRET } = require("../../config.js");

const authenticationClient = new AuthenticationClient();

async function requestToken(scopes) {
  return authenticationClient.getTwoLeggedToken(
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    scopes,
  );
}

module.exports = {
  requestToken,
  Scopes,
};
