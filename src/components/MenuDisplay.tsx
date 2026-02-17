import { useState, useEffect } from "react";
import type { MenuItem } from "@/data/menu";
import { useProducts } from "@/hooks/useProducts";

type Props = {
    onAddItem: (item: MenuItem) => void;
};

const MenuDisplay = ({ onAddItem }: Props) => {
    const { products, isLoading: loading } = useProducts();

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading menu...</div>;

    // Group items by category
    const itemsByCategory = products.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, MenuItem[]>);

    return (
        <div className="p-8 space-y-8 animate-fade-up">
            <div>
                <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">Menu</span>
                </h2>
                <p className="text-muted-foreground font-medium">Select items to add to order</p>
            </div>

            {Object.entries(itemsByCategory).map(([category, items]) => (
                <div key={category} className="space-y-4">
                    <h3 className="text-xl font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-4">
                        {category}
                        <div className="h-px flex-1 bg-border/50"></div>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onAddItem(item)}
                                className="group relative bg-card hover:bg-white dark:hover:bg-muted/20 border border-border/50 hover:border-primary/50 rounded-3xl p-4 transition-all hover:shadow-xl hover:shadow-primary/5 text-left flex flex-col gap-3 active:scale-95"
                            >
                                <div className="aspect-square w-full rounded-2xl overflow-hidden bg-muted relative">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${item.name}&background=random&color=fff`
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                        <span className="text-white text-xs font-black uppercase tracking-widest">Add +</span>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{item.name}</h4>
                                    <p className="text-primary font-black mt-1">₱{item.price}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MenuDisplay;
