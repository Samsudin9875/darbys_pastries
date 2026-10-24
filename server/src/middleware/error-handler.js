function errorHandler(error, _request, response, _next) {
  if (error?.code === "LIMIT_FILE_SIZE") {
    return response.status(413).json({ error: "file_too_large", message: "Image files must be 5 MB or smaller." });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  response.status(status).json({
    error: error.code || (status >= 500 ? "internal_server_error" : "request_error"),
    message: status >= 500 ? "Something went wrong." : error.message,
  });
}

module.exports = errorHandler;
