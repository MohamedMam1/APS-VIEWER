const axios = require("axios");
const querystring = require("querystring");
const config = require("../config");

async function getInternalToken(scopes) {
  const response = await axios.post(
    "https://developer.api.autodesk.com/authentication/v2/token",
    querystring.stringify({
      grant_type: "client_credentials",
      scope: scopes.join(" "),
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${config.apsClientId}:${config.apsClientSecret}`).toString("base64")}`,
      },
    },
  );
  return response.data;
}

async function ensureBucketExists() {
  const token = await getInternalToken(["bucket:create", "bucket:read"]);
  try {
    await axios.post(
      "https://developer.api.autodesk.com/oss/v2/buckets",
      {
        bucketKey: config.apsBucket,
        policyKey: "transient",
      },
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    if (err.response && err.response.status !== 409) {
      throw err;
    }
  }
}

async function uploadModel(fileBuffer, objectName) {
  await ensureBucketExists();
  const token = await getInternalToken(["data:write", "data:read"]);

  // Step A: Request a signed S3 Upload URL from APS
  const urlResponse = await axios.get(
    `https://developer.api.autodesk.com/oss/v2/buckets/${config.apsBucket}/objects/${encodeURIComponent(objectName)}/signeds3upload`,
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  );

  const { urls, uploadKey } = urlResponse.data;
  const s3UploadUrl = urls[0];

  await axios.put(s3UploadUrl, fileBuffer, {
    headers: { "Content-Type": "application/octet-stream" },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  const completeResponse = await axios.post(
    `https://developer.api.autodesk.com/oss/v2/buckets/${config.apsBucket}/objects/${encodeURIComponent(objectName)}/signeds3upload`,
    { uploadKey: uploadKey },
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
    },
  );

  return completeResponse.data;
}

async function translateModel(urn) {
  // FIX: Swapped out 'data:transition' for the standard required scopes 'data:write' and 'data:read'
  const token = await getInternalToken(["data:write", "data:read"]);

  const response = await axios.post(
    "https://developer.api.autodesk.com/modelderivative/v2/designdata/job",
    {
      input: { urn: urn },
      output: {
        formats: [
          {
            type: "svf",
            views: ["2d", "3d"],
          },
        ],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
}
async function getManifest(urn) {
  const token = await getInternalToken(["data:read"]);
  try {
    const response = await axios.get(
      `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/manifest`,
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
      },
    );
    return response.data;
  } catch (err) {
    if (err.response && err.response.status === 404) return null;
    throw err;
  }
}

module.exports = {
  getInternalToken,
  uploadModel,
  translateModel,
  getManifest,
};
