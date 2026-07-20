const {
  ModelDerivativeClient,
  View,
  OutputType,
} = require("@aps_sdk/model-derivative");

const modelDerivativeClient = new ModelDerivativeClient();

module.exports = {
  modelDerivativeClient,
  View,
  OutputType,
};
