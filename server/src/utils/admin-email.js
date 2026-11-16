function matchesAdminEmail(clerkUser, adminEmail) {
  const expected = String(adminEmail || "").trim().toLowerCase();
  if (!expected) return false;

  const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress;
  if (String(primaryEmail || "").trim().toLowerCase() === expected) return true;

  return clerkUser.emailAddresses?.some((entry) =>
    entry.verification?.status === "verified"
      && String(entry.emailAddress || "").trim().toLowerCase() === expected
  ) || false;
}

module.exports = matchesAdminEmail;
