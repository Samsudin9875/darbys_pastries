const { getProductById, listProducts } = require("./products.service");
async function getProducts(request, response, next) { try { response.json({ data: await listProducts(request.query) }); } catch (error) { next(error); } }
async function getProduct(request, response, next) {
  try {
    const product = await getProductById(request.params.id);
    if (!product) { const error = new Error("Product was not found."); error.status = 404; error.code = "product_not_found"; throw error; }
    response.json({ data: product });
  } catch (error) { next(error); }
}
module.exports = { getProducts, getProduct };
