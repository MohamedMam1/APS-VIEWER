const { OssClient, Region, PolicyKey } = require("@aps_sdk/oss");

const ossClient = new OssClient();

module.exports = {
  ossClient,
  Region,
  PolicyKey,
};
