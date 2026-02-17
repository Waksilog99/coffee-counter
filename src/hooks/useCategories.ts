import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type Category = {
    id: number;
    name: string;
};

export const useCategories = () => {
    const queryClient = useQueryClient();

    const { data: categories = [], isLoading, error } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const res = await fetch("http://localhost:3000/api/categories");
            if (!res.ok) throw new Error("Failed to fetch categories");
            return res.json() as Promise<Category[]>;
        },
    });

    const addCategory = useMutation({
        mutationFn: async (name: string) => {
            const res = await fetch("http://localhost:3000/api/categories", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ name })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to add category");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            toast.success("Category added successfully");
        },
        onError: (err: Error) => {
            toast.error(err.message);
        }
    });

    const deleteCategory = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`http://localhost:3000/api/categories/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            if (!res.ok) throw new Error("Failed to delete category");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            toast.success("Category deleted");
        },
        onError: (err: Error) => {
            toast.error(err.message);
        }
    });

    return { categories, isLoading, error, addCategory, deleteCategory };
};
