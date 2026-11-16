const test = require("node:test");
const assert = require("node:assert/strict");
const matchesAdminEmail = require("./admin-email");

test("admin email matching is case-insensitive and trims whitespace", () => {
  assert.equal(matchesAdminEmail({ primaryEmailAddress: { emailAddress: " Owner@Example.com " } }, "owner@example.com"), true);
});

test("a verified secondary email can identify the configured admin", () => {
  assert.equal(matchesAdminEmail({
    primaryEmailAddress: { emailAddress: "customer@example.com" },
    emailAddresses: [
      { emailAddress: "owner@example.com", verification: { status: "verified" } },
    ],
  }, "owner@example.com"), true);
});

test("an unverified secondary email cannot identify the configured admin", () => {
  assert.equal(matchesAdminEmail({
    emailAddresses: [
      { emailAddress: "owner@example.com", verification: { status: "unverified" } },
    ],
  }, "owner@example.com"), false);
});

test("an unset admin email never grants admin access", () => {
  assert.equal(matchesAdminEmail({ primaryEmailAddress: { emailAddress: "owner@example.com" } }, ""), false);
});
