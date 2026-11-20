const router = require("express").Router();
const { getFacets, getProduct, getProducts } = require("./products.controller");
const cachePublicCatalogue = (_request, response, next) => {
  response.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
  next();
};

router.get("/", cachePublicCatalogue, getProducts);
router.get("/facets", cachePublicCatalogue, getFacets);
router.get("/:id", cachePublicCatalogue, getProduct);
module.exports = router;
