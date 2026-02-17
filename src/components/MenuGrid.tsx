import { useState } from "react";
import { menuItems, categories, type MenuItem } from "@/data/menu";

type Props = {
  onAddItem: (item: MenuItem) => void;
};

const MenuGrid = ({ onAddItem }: Props) => {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]);

  const filtered = menuItems.filter((i) => i.category === activeCategory);

  return (
    <div className="flex flex-col h-full">
      {/* Category Tabs */}
      <div className="flex gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto flex-1">
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => onAddItem(item)}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border hover:border-accent hover:shadow-lg transition-all active:scale-95 gap-2 min-h-[120px]"
          >
            <span className="text-3xl">{item.emoji}</span>
            <span className="font-semibold text-sm text-card-foreground text-center leading-tight">
              {item.name}
            </span>
            <span className="text-accent font-bold text-sm">
              ${item.price.toFixed(2)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MenuGrid;
