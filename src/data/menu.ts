export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji: string;
};

export const categories = ["Hot Drinks", "Cold Drinks", "Pastries"] as const;

export const menuItems: MenuItem[] = [
  // Hot Drinks
  { id: "1", name: "Espresso", price: 3.5, category: "Hot Drinks", emoji: "☕" },
  { id: "2", name: "Americano", price: 4.0, category: "Hot Drinks", emoji: "☕" },
  { id: "3", name: "Cappuccino", price: 5.0, category: "Hot Drinks", emoji: "☕" },
  { id: "4", name: "Latte", price: 5.5, category: "Hot Drinks", emoji: "🥛" },
  { id: "5", name: "Mocha", price: 5.75, category: "Hot Drinks", emoji: "🍫" },
  { id: "6", name: "Hot Chocolate", price: 4.5, category: "Hot Drinks", emoji: "🍫" },
  { id: "7", name: "Chai Latte", price: 5.25, category: "Hot Drinks", emoji: "🍵" },
  { id: "8", name: "Matcha Latte", price: 5.75, category: "Hot Drinks", emoji: "🍵" },

  // Cold Drinks
  { id: "9", name: "Iced Latte", price: 5.5, category: "Cold Drinks", emoji: "🧊" },
  { id: "10", name: "Iced Americano", price: 4.5, category: "Cold Drinks", emoji: "🧊" },
  { id: "11", name: "Cold Brew", price: 5.0, category: "Cold Drinks", emoji: "🥤" },
  { id: "12", name: "Frappuccino", price: 6.0, category: "Cold Drinks", emoji: "🥤" },
  { id: "13", name: "Lemonade", price: 4.0, category: "Cold Drinks", emoji: "🍋" },
  { id: "14", name: "Iced Matcha", price: 6.0, category: "Cold Drinks", emoji: "🍵" },

  // Pastries
  { id: "15", name: "Croissant", price: 3.5, category: "Pastries", emoji: "🥐" },
  { id: "16", name: "Muffin", price: 3.75, category: "Pastries", emoji: "🧁" },
  { id: "17", name: "Bagel", price: 4.0, category: "Pastries", emoji: "🥯" },
  { id: "18", name: "Scone", price: 3.5, category: "Pastries", emoji: "🍪" },
  { id: "19", name: "Cinnamon Roll", price: 4.5, category: "Pastries", emoji: "🍥" },
  { id: "20", name: "Cookie", price: 2.75, category: "Pastries", emoji: "🍪" },
];
