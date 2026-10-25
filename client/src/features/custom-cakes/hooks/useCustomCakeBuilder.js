import { useMemo, useState } from "react";

import { rupees } from "../../../utils/storefrontUtils";
import { apiUrl } from "../../../utils/apiUrl";

export const flavourRates = {
  "Classic Vanilla": 700,
  "Black Forest": 700,
  Butterscotch: 800,
  "Chocolate Truffle": 850,
  "Red Velvet": 1000,
  Rasmalai: 1100,
};

export const shapeSurcharge = { Round: 0, Square: 50, Heart: 100, Tier: 700 };

const getInitialBuilder = () => ({
  occasion: "Birthday", flavour: "Classic Vanilla", weight: 1, shape: "Round", eggPreference: "Egg", cakeMessage: "",
  deliveryType: "Home Delivery", deliveryDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
  deliveryTime: "", pincode: "", address: "", customerName: "", phone: "",
});

export default function useCustomCakeBuilder() {
  const [builder, setBuilder] = useState(getInitialBuilder);
  const [builderStatus, setBuilderStatus] = useState("");
  const estimate = useMemo(() => {
    const base = (flavourRates[builder.flavour] || 700) * Number(builder.weight || 1);
    return Math.round(base + (shapeSurcharge[builder.shape] || 0) + (builder.eggPreference === "Eggless" ? 50 : 0));
  }, [builder]);
  const advanceAmount = Math.round(estimate / 2);
  const updateBuilderField = (field, value) => setBuilder((current) => ({ ...current, [field]: value }));
  const isValid = () => Boolean(builder.occasion && builder.flavour && builder.weight && builder.shape && builder.eggPreference && builder.deliveryType && builder.deliveryDate && builder.deliveryTime && builder.pincode && builder.customerName && builder.phone && (builder.deliveryType !== "Home Delivery" || builder.address));

  const submitBuilder = async (event) => {
    event.preventDefault();
    if (!isValid()) { setBuilderStatus("Please complete all required details before sending your order."); return; }
    const message = [
      "Hello Darby's Pastries, I'd like to order a custom cake.", `Occasion: ${builder.occasion}`, `Flavour: ${builder.flavour}`,
      `Weight: ${builder.weight} kg`, `Shape: ${builder.shape}`, `Egg preference: ${builder.eggPreference}`,
      `Cake message: ${builder.cakeMessage || "Not specified"}`, `Delivery type: ${builder.deliveryType}`,
      `Delivery date: ${builder.deliveryDate}`, `Delivery time: ${builder.deliveryTime}`, `Pincode: ${builder.pincode}`,
      `Address: ${builder.deliveryType === "Home Delivery" ? builder.address : "Store pickup"}`, `Customer name: ${builder.customerName}`,
      `WhatsApp/mobile: ${builder.phone}`, `Estimated total: ${rupees(estimate)}`, `50% advance: ${rupees(advanceAmount)}`,
      "Please confirm final availability, delivery charges and final price on WhatsApp.",
    ].join("\n");
    try {
      setBuilderStatus("Saving your order…");
      const response = await fetch(apiUrl("/api/orders/custom"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer: { name: builder.customerName, phone: builder.phone, address: builder.address }, customCake: builder }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Order could not be saved.");
      window.open(`https://wa.me/919835888631?text=${encodeURIComponent(`Order ID: ${payload.data.orderId}\n${message}`)}`, "_blank", "noopener");
      setBuilderStatus(`Order ${payload.data.orderId} saved. Your WhatsApp request is ready for confirmation.`);
    } catch (error) { setBuilderStatus(error.message); }
  };

  return { builder, builderStatus, estimate, advanceAmount, updateBuilderField, submitBuilder };
}
