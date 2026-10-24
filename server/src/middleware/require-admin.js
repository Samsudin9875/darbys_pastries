function requireAdmin(request, _response, next) {
  if (!request.applicationUser) {
    const error = new Error("Authentication is required.");
    error.status = 401;
    error.code = "unauthorized";
    return next(error);
  }

  if (!adminEmail || request.applicationUser.email !== adminEmail || request.applicationUser.role !== "admin") {
    const error = new Error("Administrator authorization is required.");
    error.status = 403;
    error.code = "forbidden";
    return next(error);
  }
  return next();
}

module.exports = requireAdmin;
const { adminEmail } = require("../config/env");

