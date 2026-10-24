const router = require("express").Router();
const { verifyWebhook } = require("@clerk/express/webhooks");
const User = require("../../models/user.model");
const ClerkWebhookEvent = require("../../models/clerk-webhook-event.model");

function primaryValue(entries, primaryId, valueKey) {
  return entries?.find((entry) => entry.id === primaryId)?.[valueKey] || "";
}

function profileFromClerk(data) {
  const email = primaryValue(data.email_addresses, data.primary_email_address_id, "email_address");
  if (!email) throw new Error("Clerk user event is missing a primary email address.");
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || "";
  return { email: email.toLowerCase(), name, phone: primaryValue(data.phone_numbers, data.primary_phone_number_id, "phone_number"), deletedAt: null };
}

router.post("/", async (request, response) => {
  let delivery;
  try {
    const event = await verifyWebhook(request);
    delivery = request.header("svix-id");
    if (!delivery) return response.status(400).json({ error: "invalid_webhook", message: "Webhook delivery ID is missing." });
    try { await ClerkWebhookEvent.create({ eventId: delivery, type: event.type }); }
    catch (error) { if (error?.code === 11000) return response.status(200).json({ received: true, duplicate: true }); throw error; }

    if (event.type === "user.created" || event.type === "user.updated") {
      const profile = profileFromClerk(event.data);
      await User.findOneAndUpdate({ clerkUserId: event.data.id }, { $set: profile, $setOnInsert: { clerkUserId: event.data.id, role: "customer" } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    }
    if (event.type === "user.deleted" && event.data.id) {
      await User.findOneAndUpdate({ clerkUserId: event.data.id }, { $set: { deletedAt: new Date(), name: "Deleted customer", phone: "", email: `deleted-${event.data.id}@deleted.invalid` } });
    }
    await ClerkWebhookEvent.updateOne({ eventId: delivery }, { $set: { status: "completed" } });
    return response.status(200).json({ received: true });
  } catch (error) {
    if (delivery) await ClerkWebhookEvent.deleteOne({ eventId: delivery }).catch(() => undefined);
    return response.status(400).json({ error: "invalid_webhook", message: "Webhook verification or processing failed." });
  }
});

module.exports = router;
