export const getFoodImage = (item) => {
  if (item?.image) return item.image;

  const name = item?.name?.toLowerCase() || "";

  if (name.includes("pizza")) return "/food-images/pizza.jpg";
  if (name.includes("burger")) return "/food-images/burger.jpg";
  if (name.includes("paneer")) return "/food-images/paneer.jpg";
  if (name.includes("biryani")) return "/food-images/biryani.jpg";
  if (name.includes("chole") || name.includes("bhature")) return "/food-images/chole-bhature.jpg";
  if (name.includes("dosa")) return "/food-images/dosa.jpg";
  if (name.includes("noodles")) return "/food-images/noodles.jpg";
  if (name.includes("pasta")) return "/food-images/pasta.jpg";
  if (name.includes("sandwich")) return "/food-images/sandwich.jpg";
  if (name.includes("momos")) return "/food-images/momos.jpg";
  if (name.includes("chaap")) return "/food-images/chaap.jpg";
  if (name.includes("coffee")) return "/food-images/coffee.jpg";
  if (name.includes("tea") || name.includes("chai")) return "/food-images/tea.jpg";
  if (name.includes("shake")) return "/food-images/shake.jpg";
  if (name.includes("juice")) return "/food-images/juice.jpg";
  if (name.includes("fries")) return "/food-images/fries.jpg";
  if (name.includes("manchurian")) return "/food-images/manchurian.jpg";
  if (name.includes("fried rice")) return "/food-images/fried-rice.jpg";
  if (name.includes("dal")) return "/food-images/dal.jpg";
  if (name.includes("naan") || name.includes("roti")) return "/food-images/naan.jpg";
  if (name.includes("thali")) return "/food-images/thali.jpg";
  if (name.includes("cake")) return "/food-images/cake.jpg";
  if (name.includes("ice cream") || name.includes("ice-cream")) return "/food-images/ice-cream.jpg";

  return "/food-images/default-food.jpg";
};

export default getFoodImage;

