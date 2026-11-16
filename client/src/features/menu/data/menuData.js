export const labels = {
  cakes: "Cakes",
  classic: "Classic Cakes",
  chocolate: "Chocolate Cakes",
  fruit: "Fruit Cakes",
  special: "Premium & Special Cakes",
  photo: "Photo Cakes",
  desserts: "Desserts",
  custom: "Custom Cake",
  flowers: "Flowers",
  chocolates: "Chocolates",
  accessories: "Cake Accessories",
  "gift-hampers": "Gift Hampers",
};

export const mainCategoryOptions = [
  ["cakes", "Cakes"],
  ["flowers", "Flowers"],
  ["chocolates", "Chocolates"],
  ["accessories", "Cake Accessories"],
  ["gift-hampers", "Gift Hampers"],
];

export const cakeSubcategoryOptions = [
  ["classic", "Classic Cakes"],
  ["chocolate", "Chocolate Cakes"],
  ["fruit", "Fruit Cakes"],
  ["special", "Premium & Special Cakes"],
  ["photo", "Photo Cakes"],
  ["desserts", "Desserts"],
  ["custom", "Custom Cake"],
];

export const cakeSizeOptions = [
  ["500 g", 500],
  ["1 kg", 1000],
  ["1.5 kg", 1500],
  ["2 kg", 2000],
  ["2.5 kg", 2500],
  ["3 kg", 3000],
];

export const occasionOptions = [
  ["birthday", "Birthday"],
  ["anniversary", "Anniversary"],
  ["baby-shower", "Baby Shower"],
  ["festival", "Festival"],
  ["other-special-occasions", "Other Special Occasions"],
];

export const themeOptions = [
  ["avengers", "Avengers"],
  ["sonic", "Sonic"],
  ["doraemon", "Doraemon"],
  ["tom-jerry", "Tom & Jerry"],
  ["barbie", "Barbie"],
  ["jungle-safari", "Jungle Safari"],
  ["other-themes", "Other themes"],
];

export const mainCategoryForLegacyKey = (key) =>
  ["flowers", "chocolates", "accessories", "gift-hampers"].includes(key) ? key : "cakes";

export const cakeSubcategoryForLegacyKey = (key) => ({
  classic: "classic",
  chocolate: "chocolate",
  fruit: "fruit",
  special: "special",
  custom: "photo",
  photo: "photo",
  desserts: "desserts",
}[key] || "");

export const defaultCakeMenuGroups = [
  {
    id: "cakes",
    title: "Cake Categories",
    items: [
      { id: "classic", label: "Classic Cakes", action: "classic" },
      { id: "chocolate", label: "Chocolate Cakes", action: "chocolate" },
      { id: "fruit", label: "Fruit Cakes", action: "fruit" },
      { id: "special", label: "Premium & Special Cakes", action: "special" },
      { id: "photo", label: "Photo Cakes", action: "photo" },
      { id: "desserts", label: "Desserts", action: "desserts" },
      { id: "custom", label: "Custom Cake", action: "custom" },
    ],
  },
];

export const mergeCakeMenuGroups = () => defaultCakeMenuGroups.map((group) => ({ ...group }));

// Existing rates are retained where the flavour already existed. Update final
// pricing later from the Admin panel when the rate card is confirmed.
export const menuByCategory = {
  classic: [
    ["Black Forest Classic", 350, 600, "Active", "Classic Favourites"], ["White Forest Cake", 350, 650, "Active", "Classic Favourites"], ["Vanilla Truffle Cake", 450, 750, "Active", "Classic Favourites"], ["Caramel Butterscotch", 500, 900, "Active", "Classic Favourites"], ["Dry Fruit Cake", 600, 1100, "Active", "Classic Favourites"], ["Honey Almond", 450, 850, "Active", "Classic Favourites"], ["Irish Coffee", 400, 900, "Active", "Classic Favourites"],
  ],
  chocolate: [
    ["Choco Almond", 500, 950, "Active", "Chocolate Collection"], ["Choco Vanilla Cake", 450, 800, "Active", "Chocolate Collection"], ["Choco Truffle", 450, 800, "Active", "Chocolate Collection"], ["Choco Chip Cake", 500, 900, "Active", "Chocolate Collection"], ["Choco Chips Cake", 500, 900, "Active", "Chocolate Collection"], ["Choco Oreo Forest", 500, 950, "Active", "Chocolate Collection"], ["Double Chocolate", 650, 1100, "Active", "Chocolate Collection"], ["Belgium Chocolate", 650, 1200, "Active", "Premium Chocolate"],
  ],
  fruit: [
    ["Mango Cake", 400, 700, "Active", "Fruit Favourites"], ["Black Currant Cake", 400, 700, "Active", "Fruit Favourites"], ["Strawberry Cake", 400, 700, "Active", "Fruit Favourites"], ["Mango Almond", 450, 850, "Active", "Fruit Favourites"], ["Blueberry Cake", 450, 800, "Active", "Fruit Favourites"], ["Pineapple Cake", 350, 600, "Active", "Fruit Favourites"], ["Rasmalai Cake", 650, 1100, "Active", "Indian-Inspired"],
  ],
};

export const productDescriptions = {
  "Black Forest Classic": "A timeless chocolate sponge layered with cream and cherries.", "White Forest Cake": "Vanilla sponge, light cream and cherry notes in a classic celebration cake.", "Vanilla Truffle Cake": "Smooth vanilla cream layered over a soft, indulgent sponge.", "Caramel Butterscotch": "Rich butterscotch cream with a gentle caramel finish.", "Dry Fruit Cake": "A premium celebration cake finished with a generous dry-fruit topping.", "Honey Almond": "Honey-kissed cream cake with a delicate almond crunch.", "Irish Coffee": "Coffee-forward cream cake for a refined dessert moment.", "Choco Almond": "Chocolate cake with a rich almond finish.", "Choco Vanilla Cake": "Classic chocolate and vanilla layers in one celebration cake.", "Choco Truffle": "Deep chocolate truffle cream over soft chocolate sponge.", "Choco Chip Cake": "Chocolate sponge with a generous choco-chip finish.", "Choco Chips Cake": "A chocolate celebration cake topped with crunchy choco chips.", "Choco Oreo Forest": "Chocolate forest cake with Oreo-inspired cream and crumble.", "Double Chocolate": "An intense double-chocolate cake for chocolate lovers.", "Belgium Chocolate": "Premium Belgian-style chocolate cake with a luxurious finish.", "Mango Cake": "Bright mango cream cake made for sunny celebrations.", "Black Currant Cake": "Fruity black-currant cream cake with a vibrant finish.", "Strawberry Cake": "Fresh strawberry-inspired cream cake for every occasion.", "Mango Almond": "Mango cream and almond notes in a smooth, festive cake.", "Blueberry Cake": "Blueberry cream cake with a sweet berry finish.", "Pineapple Cake": "Classic pineapple cream cake with a fresh tropical profile.", "Rasmalai Cake": "A rich Indian-inspired rasmalai cake for special occasions.",
};

export const bestSellerNames = new Set(["Black Forest Classic", "Choco Truffle", "Belgium Chocolate", "Mango Cake", "Rasmalai Cake", "White Forest Cake"]);

export const allProducts = () => Object.entries(menuByCategory).flatMap(([category, items]) =>
  items.map(([name, p500, p1kg, status = "Active", subcategory = ""]) => ({ name, p500, p1kg, status, subcategory, category })),
);

// Legacy cart/admin callers can render this neutral placeholder while the
// product has no Cloudinary image. Storefront cards use a text placeholder.
export const getImageFor = (name) => ({
  src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E",
  alt: `${name} image coming soon`,
});
