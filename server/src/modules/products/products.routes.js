const router = require("express").Router();
const { getProduct, getProducts } = require("./products.controller");
router.get("/", getProducts);
router.get("/:id", getProduct);
module.exports = router;
