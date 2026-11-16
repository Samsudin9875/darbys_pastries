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
  requireAdmin({ authenticatedUser: { isAdmin: false }, applicationUser: { email: "customer@example.com", role: "customer" } }, null, (error) => { received = error; });
  assert.equal(received.status, 403);
  assert.equal(received.code, "forbidden");
});

test("admin middleware accepts the authenticated configured admin", () => {
  let received;
  requireAdmin({ authenticatedUser: { isAdmin: true }, applicationUser: { email: "owner@example.com", role: "admin" } }, null, (error) => { received = error; });
  assert.equal(received, undefined);
});

test("admin middleware rejects a customer even when the auth context claims admin", () => {
  let received;
  requireAdmin({ authenticatedUser: { isAdmin: true }, applicationUser: { email: "customer@example.com", role: "customer" } }, null, (error) => { received = error; });
  assert.equal(received.status, 403);
  assert.equal(received.code, "forbidden");
});
