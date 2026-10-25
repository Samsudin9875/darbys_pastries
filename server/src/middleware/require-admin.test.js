const test = require("node:test");
const assert = require("node:assert/strict");
const requireAdmin = require("./require-admin");

test("admin middleware rejects requests without an authenticated application user", () => {
  let received;
  requireAdmin({}, null, (error) => { received = error; });
  assert.equal(received.status, 401);
  assert.equal(received.code, "unauthorized");
});

test("admin middleware rejects authenticated non-admin users", () => {
  let received;
  requireAdmin({ applicationUser: { email: "customer@example.com", role: "customer" } }, null, (error) => { received = error; });
  assert.equal(received.status, 403);
  assert.equal(received.code, "forbidden");
});
