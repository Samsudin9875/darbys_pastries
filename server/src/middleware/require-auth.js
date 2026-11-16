const { clerkClient, getAuth } = require("@clerk/express");
const User = require("../models/user.model");
const { adminEmail } = require("../config/env");
const matchesAdminEmail = require("../utils/admin-email");

function unauthorized(next) {
  const error = new Error("Authentication is required.");
  error.status = 401;
  error.code = "unauthorized";
  next(error);
}

function getUserProfile(clerkUser) {
  const email = clerkUser.primaryEmailAddress?.emailAddress;
  if (!email) {
    const error = new Error("The authenticated Clerk user does not have a primary email address.");
    error.status = 400;
    error.code = "clerk_user_email_missing";
    throw error;
  }

  const phone = clerkUser.phoneNumbers?.find((entry) => entry.id === clerkUser.primaryPhoneNumberId)?.phoneNumber || "";
  return { email: email.trim().toLowerCase(), name: clerkUser.fullName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" "), phone, deletedAt: null };
}

async function requireAuth(request, _response, next) {
  try {
    const { isAuthenticated, userId } = getAuth(request);
    if (!isAuthenticated || !userId) return unauthorized(next);

    const clerkUser = await clerkClient.users.getUser(userId);
    const profile = getUserProfile(clerkUser);
    const isAdmin = matchesAdminEmail(clerkUser, adminEmail);
    const applicationUser = await User.findOneAndUpdate(
      { clerkUserId: userId },
      { $set: { ...profile, role: isAdmin ? "admin" : "customer" }, $setOnInsert: { clerkUserId: userId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    request.authenticatedUser = { clerkUserId: userId, isAdmin };
    request.applicationUser = applicationUser;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = requireAuth;
