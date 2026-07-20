const express = require("express");
const { getInternalToken } = require("../services/aps");
const router = express.Router();

router.get("/api/auth/token", async (req, res, next) => {
  try {
    const token = await getInternalToken(["viewables:read"]);
    res.json({
      access_token: token.access_token,
      expires_in: token.expires_in,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
