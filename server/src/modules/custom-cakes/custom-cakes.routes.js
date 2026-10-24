const router = require("express").Router();
const requireAuth = require("../../middleware/require-auth");
const { productImageUpload, uploadImage } = require("../../integrations/cloudinary/upload");

router.post("/reference-images", requireAuth, productImageUpload.single("image"), async (request, response, next) => {
  try {
    if (!request.file) {
      const error = new Error("A reference image file is required.");
      error.status = 400;
      error.code = "image_required";
      throw error;
    }
    const uploaded = await uploadImage(request.file, { folder: "cakes/custom-cakes", publicId: `${request.authenticatedUser.clerkUserId}-${Date.now()}` });
    response.status(201).json({ data: uploaded });
  } catch (error) { next(error); }
});

module.exports = router;
