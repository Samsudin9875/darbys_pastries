const router = require("express").Router();
const { getFacets, getProduct, getProducts } = require("./products.controller");
router.get("/", getProducts);
router.get("/facets", getFacets);
router.get("/:id", getProduct);
module.exports = router;
