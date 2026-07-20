const express = require("express");
const path = require("path");
const config = require("./config");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "wwwroot")));

app.use(require("./routes/auth"));
app.use(require("./routes/models"));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
