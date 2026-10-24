function getHealth(_request, response) {
  response.json({ status: "ok", service: "darbys-pastries-api" });
}

module.exports = { getHealth };
