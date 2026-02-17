export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
};

// export const categories = ["Hot Drinks", "Cold Drinks", "Pastries"] as const;

export const menuItems: MenuItem[] = [
  // Hot Drinks
  { id: "1", name: "Espresso", price: 140, category: "Hot Drinks", image: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&q=80" },
  { id: "2", name: "Americano", price: 160, category: "Hot Drinks", image: "https://redplatter.ph/restaurant/wp-content/uploads/2016/08/Cafe-Americano-1.jpg" },
  { id: "3", name: "Cappuccino", price: 200, category: "Hot Drinks", image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=80" },
  { id: "4", name: "Latte", price: 220, category: "Hot Drinks", image: "https://nucleuscoffee.com/cdn/shop/articles/Latte-recipe.jpg" },
  { id: "5", name: "Mocha", price: 230, category: "Hot Drinks", image: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=800&q=80" },
  { id: "6", name: "Hot Chocolate", price: 180, category: "Hot Drinks", image: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=800&q=80" },
  { id: "7", name: "Chai Latte", price: 210, category: "Hot Drinks", image: "https://images.unsplash.com/photo-1576092762791-2f31f045052c?w=800&q=80" },
  { id: "8", name: "Matcha Latte", price: 230, category: "Hot Drinks", image: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&q=80" },

  // Cold Drinks
  { id: "9", name: "Iced Latte", price: 220, category: "Cold Drinks", image: "https://images.unsplash.com/photo-1517701604599-bb29b5dd73ad?w=800&q=80" },
  { id: "10", name: "Iced Americano", price: 180, category: "Cold Drinks", image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=800&q=80" },
  { id: "11", name: "Cold Brew", price: 200, category: "Cold Drinks", image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=800&q=80" }, // Reusing iced coffee image for demo
  { id: "12", name: "Frappuccino", price: 240, category: "Cold Drinks", image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=80" },
  { id: "13", name: "Lemonade", price: 160, category: "Cold Drinks", image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80" },
  { id: "14", name: "Iced Matcha", price: 240, category: "Cold Drinks", image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80" },

  // Pastries
  { id: "15", name: "Croissant", price: 140, category: "Pastries", image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80" },
  { id: "16", name: "Muffin", price: 150, category: "Pastries", image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=80" },
  { id: "17", name: "Bagel", price: 160, category: "Pastries", image: "https://images.unsplash.com/photo-1585478259715-876a6a81fc08?w=800&q=80" },
  { id: "18", name: "Scone", price: 140, category: "Pastries", image: "https://images.unsplash.com/photo-1589118949245-7d38baf380d6?w=800&q=80" },
  { id: "19", name: "Cinnamon Roll", price: 180, category: "Pastries", image: "https://images.unsplash.com/photo-1621236378699-8597faf6a176?w=800&q=80" },
  { id: "20", name: "Cookie", price: 110, category: "Pastries", image: "https://images.unsplash.com/photo-1499636138143-bd630f5cf386?w=800&q=80" },
];
