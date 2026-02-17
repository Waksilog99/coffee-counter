import { useState, useEffect } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { type MenuItem } from "@/data/menu";
import { Search, Plus } from "lucide-react";

type Props = {
  onAddItem: (item: MenuItem) => void;
};

const MenuGrid = ({ onAddItem }: Props) => {
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const { products, isLoading: productsLoading } = useProducts();

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].name);
    }
  }, [categories]);

  const loading = productsLoading || categoriesLoading;

  const filtered = products.filter(
    (i) =>
      i.category === activeCategory &&
      i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading menu...</div>;

  return (
    <div className="flex flex-col h-full gap-8">
      {/* Search and Filter */}
      <div className="flex flex-col gap-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold transition-all shadow-sm"
          />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.name)}
              className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory === category.name
                ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                : "bg-card text-muted-foreground hover:bg-gray-100 dark:hover:bg-muted border border-transparent hover:border-border"
                }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => onAddItem(item)}
              className="bg-card hover:bg-white dark:hover:bg-muted/20 border border-border/50 hover:border-primary/50 p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] text-left transition-all hover:shadow-xl hover:shadow-primary/5 group flex flex-col gap-3 active:scale-95"
            >
              <div className="aspect-square rounded-2xl overflow-hidden bg-muted relative">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${item.name}&background=random&color=fff`
                  }}
                />
                <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-black/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <Plus className="w-4 h-4 text-primary" strokeWidth={3} />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-foreground line-clamp-1">{item.name}</h4>
                <p className="text-primary font-black text-lg">₱{item.price}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuGrid;
