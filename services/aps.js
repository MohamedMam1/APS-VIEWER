const axios = require("axios");
const querystring = require("querystring");
const config = require("../config");

const tokenCache = new Map();

function normalizeScopes(scopes) {
  return [...new Set((scopes || []).slice().sort())].join(" ");
}

function getCachedToken(cacheKey) {
  const cached = tokenCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (Date.now() >= cached.expiresAt) {
    tokenCache.delete(cacheKey);
    return null;
  }

  return cached.token;
}

function cacheToken(cacheKey, tokenData) {
  const expiresIn = Math.max(Number(tokenData.expires_in) - 60, 60);
  tokenCache.set(cacheKey, {
    token: tokenData,
    expiresAt: Date.now() + expiresIn * 1000,
  });
  return tokenData;
}

async function getInternalToken(scopes) {
  const cacheKey = normalizeScopes(scopes);
  const cachedToken = getCachedToken(cacheKey);
  if (cachedToken) {
    return cachedToken;
  }

  const response = await axios.post(
    "https://developer.api.autodesk.com/authentication/v2/token",
    querystring.stringify({
      grant_type: "client_credentials",
      scope: cacheKey,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${config.apsClientId}:${config.apsClientSecret}`).toString("base64")}`,
      },
    },
  );

  return cacheToken(cacheKey, response.data);
}

function requireToken(scopes) {
  return async (req, res, next) => {
    try {
      req.internalToken = await getInternalToken(scopes);
      next();
    } catch (err) {
      next(err);
    }
  };
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
  requireToken,
  uploadModel,
  translateModel,
  getManifest,
};
