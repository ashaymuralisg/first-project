import { randomUUID } from "node:crypto";
import { stmts } from "./db.js";

// Seeded from the OVERBRØD menu. Dietary tags are conservative placeholders —
// the owner must verify them (food-safety / misrepresentation risk).
const SEED = [
  ["Mushroom", 15, "Smørrebrød", "Roasted and pickled mushrooms on dark rye with fresh herbs — earthy, meat-free and surprisingly full.", 0, ["Nut-free"], 0],
  ["Roast Beef", 18, "Smørrebrød", "Thin-sliced roast beef with remoulade and crisp fried onions on buttered rye.", 0, ["Nut-free"], 0],
  ["Toast Skagen / Shrimp V2.0", 19, "Smørrebrød", "Cold-water shrimp in a dill-and-lemon mayo, piled on toasted bread — our take on the Swedish classic.", 0, ["Nut-free"], 0],
  ["Gravadlax / Cured Salmon", 19, "Smørrebrød", "House-cured salmon with mustard-dill sauce; silky, bright and delicate.", 1, ["Nut-free"], 0],
  ["The Shooting Star / Stjerneskud", 26, "Smørrebrød", "Thick fried halibut, poached shrimp, asparagus and mustard sauce — the plate everyone talks about.", 1, ["Nut-free"], 0],
  ["Leverpostej / Danish Liver Pâté", 12, "Hot Mains & Platters", "Warm Danish liver pâté with pickles and crisp bacon on rye.", 0, ["Nut-free"], 0],
  ["Frikadeller / Meatballs", 18, "Hot Mains & Platters", "Pan-fried Danish pork-and-veal meatballs with gravy and lingonberry.", 1, ["Nut-free"], 0],
  ["Fisksoppa / Swedish Fish Stew", 24, "Hot Mains & Platters", "Creamy Swedish fish stew with potatoes, fish and prawns, served with toasted bread.", 1, ["Nut-free"], 0],
  ["Soup or Salad of the Day", 4, "Sides", "Ask us what we've made today. Add to any main.", 0, [], 1],
  ["Kanelbullar / Cinnamon Knot Bun", 7, "Pastries & Desserts", "Cardamom-scented cinnamon knot, baked in-house.", 0, [], 0],
  ["Ben and Berry Tart", 7, "Pastries & Desserts", "Buttery tart with seasonal berries.", 0, ["Nut-free"], 0],
  ["Chocolate Tart", 10, "Pastries & Desserts", "Dark chocolate ganache tart with a crisp shell.", 0, ["Nut-free"], 0],
  ["Hot Black Coffee / Seasonal Batch Brew", 5, "Beverages", "Seasonal single-origin batch brew, served hot.", 0, ["Vegan", "Gluten-free", "Nut-free"], 0],
  ["Ice Black Coffee / Cold Brew", 6, "Beverages", "Slow-steeped cold brew over ice.", 0, ["Vegan", "Gluten-free", "Nut-free"], 0],
  ["Cold Brew White", 7, "Beverages", "Cold brew lengthened with milk.", 0, ["Gluten-free", "Nut-free"], 0],
  ["Pink Gingerlily Tea", 7, "Beverages", "House-blended ginger-and-lily iced tea.", 0, ["Vegan", "Gluten-free", "Nut-free"], 0],
  ["Ice Elderflower Tea / House Soda", 7, "Beverages", "Elderflower house soda, lightly sparkling.", 0, ["Vegan", "Gluten-free", "Nut-free"], 0],
];

export function seedMenuIfEmpty() {
  if (stmts.countMenu.get().n > 0) return;
  SEED.forEach((row, i) => {
    const [name, price, category, description, signature, diet, addOn] = row;
    stmts.insertMenu.run({
      id: randomUUID(), name, price, category, image: "", description,
      signature, available: 1, add_on: addOn, diet: JSON.stringify(diet), sort: i,
    });
  });
}
