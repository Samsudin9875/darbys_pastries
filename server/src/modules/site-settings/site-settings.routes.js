const router = require("express").Router();
const SiteSetting = require("../../models/site-setting.model");

router.get("/", async (_request, response, next) => {
  try { const setting = await SiteSetting.findOne({ key: "homepage" }).lean(); response.json({ data: setting?.value || null }); } catch (error) { next(error); }
});

module.exports = router;
