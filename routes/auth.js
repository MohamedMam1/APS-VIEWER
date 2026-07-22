const express = require("express");
const { requireToken } = require("../services/aps");
const router = express.Router();

router.get(
  "/api/auth/token",
  requireToken(["viewables:read"]),
  async (req, res, next) => {
    try {
      const token = req.internalToken;
      res.json({
        access_token: token.access_token,
        expires_in: token.expires_in,
      });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
