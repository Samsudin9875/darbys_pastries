const { findProducts, getProductById, getProductFacets } = require("./products.service");
async function getProducts(request, response, next) {
  try {
    const result = await findProducts(request.query);
    response.json(result);
  } catch (error) { next(error); }
}
async function getFacets(_request, response, next) {
  try { response.json({ data: await getProductFacets() }); } catch (error) { next(error); }
}
async function getProduct(request, response, next) {
  try {
    const product = await getProductById(request.params.id);
    if (!product) { const error = new Error("Product was not found."); error.status = 404; error.code = "product_not_found"; throw error; }
    response.json({ data: product });
  } catch (error) { next(error); }
}
module.exports = { getProducts, getProduct, getFacets };
