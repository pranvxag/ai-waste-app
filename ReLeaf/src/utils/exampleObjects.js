// Example objects for HomeScreen's "Try scanning these" section and its
// "View More" modal. Each `predictedClass` must be one of the 12 classes the
// trained model actually recognizes (see backend/model/class_names.json) -
// only include objects that genuinely belong to one of those classes, so an
// example's result is honest, not a guessed stand-in.
//
// The first COMPACT_COUNT entries are what HomeScreen shows in the
// always-visible row; the full array is what the "View More" modal shows.
export const COMPACT_COUNT = 4;

export const EXAMPLE_OBJECTS = [
  { label: "Glass bottle", predictedClass: "white-glass", icon: "bottle-wine" },
  { label: "Battery", predictedClass: "battery", icon: "battery-outline" },
  { label: "Cardboard box", predictedClass: "cardboard", icon: "package-variant-closed" },
  { label: "Old shoes", predictedClass: "shoes", icon: "shoe-sneaker" },

  { label: "Plastic bottle", predictedClass: "plastic", icon: "bottle-soda-classic" },
  { label: "Plastic bag", predictedClass: "plastic", icon: "shopping-outline" },
  { label: "Food wrapper", predictedClass: "plastic", icon: "food-outline" },
  { label: "Aluminium can", predictedClass: "metal", icon: "recycle" },
  { label: "Metal container", predictedClass: "metal", icon: "archive-outline" },
  { label: "Newspaper", predictedClass: "paper", icon: "newspaper-variant-outline" },
  { label: "Paper sheets", predictedClass: "paper", icon: "file-outline" },
  { label: "Green glass bottle", predictedClass: "green-glass", icon: "bottle-wine" },
  { label: "Brown glass bottle", predictedClass: "brown-glass", icon: "bottle-wine" },
  { label: "Clothes", predictedClass: "clothes", icon: "hanger" },
  { label: "Food scraps", predictedClass: "biological", icon: "food-apple-outline" },
  { label: "Mixed waste", predictedClass: "trash", icon: "trash-can-outline" },
];
