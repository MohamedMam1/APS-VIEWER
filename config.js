require("dotenv").config();

const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_BUCKET, ADMIN_SECRET_KEY, PORT } =
  process.env;

module.exports = {
  apsClientId: APS_CLIENT_ID,
  apsClientSecret: APS_CLIENT_SECRET,
  apsBucket: APS_BUCKET.toLowerCase(),
  adminSecretKey: ADMIN_SECRET_KEY,
  port: PORT || 3000,
};
