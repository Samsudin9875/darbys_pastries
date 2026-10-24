const router = require("express").Router();
const { getHealth } = require("./health.controller");

router.get("/health", getHealth);
module.exports = router;
