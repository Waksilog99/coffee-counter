import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MenuItem } from "@/data/menu";

import { getApiUrl } from "@/lib/api";

export const useProducts = () => {
    const queryClient = useQueryClient();

    const { data: products = [], isLoading, error } = useQuery({
        queryKey: ["products"],
        queryFn: async () => {
            const res = await fetch(getApiUrl("/api/products"));
            if (!res.ok) throw new Error("Failed to fetch products");
            return res.json() as Promise<MenuItem[]>;
        },
    });

    const addProduct = useMutation({
        mutationFn: async (newProduct: any) => {
            const res = await fetch(getApiUrl("/api/products"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}` // Helper if token isn't passed
                },
                body: JSON.stringify(newProduct)
            });
            if (!res.ok) {
                const text = await res.text();
                try {
                    const data = JSON.parse(text);
                    throw new Error(data.error || "Failed to add product");
                } catch (e) {
                    console.error("Server returned non-JSON response:", text);
                    throw new Error(`Server error: ${res.status} ${res.statusText}`);
                }
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success("Product added successfully");
        },
        onError: (err: Error) => {
            toast.error(err.message);
            console.error("Add Product Error:", err);
        }

    });

    const updateProduct = useMutation({
        mutationFn: async ({ id, ...updatedProduct }: any) => {
            const res = await fetch(getApiUrl(`/api/products/${id}`), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(updatedProduct)
            });
            if (!res.ok) throw new Error("Failed to update product");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success("Product updated successfully");
        },
        onError: (err: Error) => {
            toast.error(err.message);
        }
    });

    const deleteProduct = useMutation({
        mutationFn: async (id: number | string) => {
            const res = await fetch(getApiUrl(`/api/products/${id}`), {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            if (!res.ok) throw new Error("Failed to delete product");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            toast.success("Product deleted");
        },
        onError: (err: Error) => {
            toast.error(err.message);
        }
    });

    return { products, isLoading, error, addProduct, deleteProduct, updateProduct };
};
