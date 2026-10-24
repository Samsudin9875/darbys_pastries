const router = require("express").Router();

for (const resource of ["cart", "payments", "coupons", "reviews", "inventory", "delivery", "users"]) {
  router.all(`/${resource}*`, (_request, response) => response.status(501).json({ error: "not_implemented", message: `${resource} persistence is not configured yet.` }));
}

module.exports = router;
