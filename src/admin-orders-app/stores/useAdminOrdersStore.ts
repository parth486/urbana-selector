import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface CustomerSubmission {
  id: string;
  submittedAt: string;
  productGroup: string;
  productRange: string;
  individualProduct: string;
  options: Record<string, string>;
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
    company: string;
    message: string;
  };
  status: "new" | "viewed" | "contacted" | "completed" | "archived";
  notes: string;
  priority: "low" | "medium" | "high";
}

interface AdminOrdersState {
  submissions: CustomerSubmission[];
  filteredSubmissions: CustomerSubmission[];
  isLoading: boolean;
  error: string | null;

  // Filters and sorting
  statusFilter: string;
  priorityFilter: string;
  searchQuery: string;
  sortBy: string;
  sortOrder: "asc" | "desc";

  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;

  // Actions
  fetchSubmissions: () => Promise<void>;
  updateSubmissionStatus: (id: string, status: CustomerSubmission["status"]) => Promise<void>;
  updateSubmissionPriority: (id: string, priority: CustomerSubmission["priority"]) => Promise<void>;
  updateSubmissionNotes: (id: string, notes: string) => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;

  // Filter and search actions
  setStatusFilter: (status: string) => void;
  setPriorityFilter: (priority: string) => void;
  setSearchQuery: (query: string) => void;
  setSorting: (sortBy: string, sortOrder: "asc" | "desc") => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;

  // Utility actions
  applyFilters: () => void;
  exportSubmissions: (format: "csv" | "xlsx") => Promise<void>;
  bulkUpdateStatus: (ids: string[], status: CustomerSubmission["status"]) => Promise<void>;
}

export const useAdminOrdersStore = create<AdminOrdersState>()(
  devtools(
    (set, get) => ({
      submissions: [],
      filteredSubmissions: [],
      isLoading: false,
      error: null,

      // Filters and sorting
      statusFilter: "all",
      priorityFilter: "all",
      searchQuery: "",
      sortBy: "submittedAt",
      sortOrder: "desc",

      // Pagination
      currentPage: 1,
      itemsPerPage: 25,
      totalPages: 1,

      fetchSubmissions: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch("/wp-json/urbana/v1/submissions", {
            headers: {
              "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
            },
          });

          if (!response.ok) {
            throw new Error("Failed to fetch submissions");
          }

          const data = await response.json();
          set({
            submissions: data,
            isLoading: false,
          });

          // Apply filters after fetching
          get().applyFilters();
        } catch (error: any) {
          set({
            error: error.message,
            isLoading: false,
          });
        }
      },

      updateSubmissionStatus: async (id, status) => {
        try {
          const response = await fetch(`/wp-json/urbana/v1/submissions/${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
            },
            body: JSON.stringify({ status }),
          });

          if (!response.ok) {
            throw new Error("Failed to update submission status");
          }

          // Update local state
          set((state) => ({
            submissions: state.submissions.map((submission) => (submission.id === id ? { ...submission, status } : submission)),
          }));

          get().applyFilters();
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      updateSubmissionPriority: async (id, priority) => {
        try {
          const response = await fetch(`/wp-json/urbana/v1/submissions/${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
            },
            body: JSON.stringify({ priority }),
          });

          if (!response.ok) {
            throw new Error("Failed to update submission priority");
          }

          // Update local state
          set((state) => ({
            submissions: state.submissions.map((submission) => (submission.id === id ? { ...submission, priority } : submission)),
          }));

          get().applyFilters();
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      updateSubmissionNotes: async (id, notes) => {
        try {
          const response = await fetch(`/wp-json/urbana/v1/submissions/${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
            },
            body: JSON.stringify({ notes }),
          });

          if (!response.ok) {
            throw new Error("Failed to update submission notes");
          }

          // Update local state
          set((state) => ({
            submissions: state.submissions.map((submission) => (submission.id === id ? { ...submission, notes } : submission)),
          }));

          get().applyFilters();
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      deleteSubmission: async (id) => {
        try {
          const response = await fetch(`/wp-json/urbana/v1/submissions/${id}`, {
            method: "DELETE",
            headers: {
              "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
            },
          });

          if (!response.ok) {
            throw new Error("Failed to delete submission");
          }

          // Remove from local state
          set((state) => ({
            submissions: state.submissions.filter((submission) => submission.id !== id),
          }));

          get().applyFilters();
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      setStatusFilter: (status) => {
        set({ statusFilter: status, currentPage: 1 });
        get().applyFilters();
      },

      setPriorityFilter: (priority) => {
        set({ priorityFilter: priority, currentPage: 1 });
        get().applyFilters();
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query, currentPage: 1 });
        get().applyFilters();
      },

      setSorting: (sortBy, sortOrder) => {
        set({ sortBy, sortOrder });
        get().applyFilters();
      },

      setCurrentPage: (page) => set({ currentPage: page }),

      setItemsPerPage: (items) => {
        set({ itemsPerPage: items, currentPage: 1 });
        get().applyFilters();
      },

      applyFilters: () => {
        const { submissions, statusFilter, priorityFilter, searchQuery, sortBy, sortOrder, itemsPerPage } = get();

        let filtered = [...submissions];

        // Apply status filter
        if (statusFilter !== "all") {
          filtered = filtered.filter((submission) => submission.status === statusFilter);
        }

        // Apply priority filter
        if (priorityFilter !== "all") {
          filtered = filtered.filter((submission) => submission.priority === priorityFilter);
        }

        // Apply search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (submission) =>
              submission.contactInfo.fullName.toLowerCase().includes(query) ||
              submission.contactInfo.email.toLowerCase().includes(query) ||
              submission.contactInfo.company.toLowerCase().includes(query) ||
              submission.productGroup.toLowerCase().includes(query) ||
              submission.productRange.toLowerCase().includes(query) ||
              submission.individualProduct.toLowerCase().includes(query)
          );
        }

        // Apply sorting
        filtered.sort((a, b) => {
          let aValue: any = a[sortBy as keyof CustomerSubmission];
          let bValue: any = b[sortBy as keyof CustomerSubmission];

          // Handle nested properties
          if (sortBy.startsWith("contactInfo.")) {
            const key = sortBy.split(".")[1];
            aValue = a.contactInfo[key as keyof CustomerSubmission["contactInfo"]];
            bValue = b.contactInfo[key as keyof CustomerSubmission["contactInfo"]];
          }

          // Handle date sorting
          if (sortBy === "submittedAt") {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
          }

          if (typeof aValue === "string") {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }

          if (sortOrder === "asc") {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });

        const totalPages = Math.ceil(filtered.length / itemsPerPage);

        set({
          filteredSubmissions: filtered,
          totalPages,
        });
      },

      exportSubmissions: async (format) => {
        const { filteredSubmissions } = get();

        try {
          const response = await fetch("/wp-json/urbana/v1/submissions/export", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
            },
            body: JSON.stringify({
              submissions: filteredSubmissions,
              format,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to export submissions");
          }

          // Trigger download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `urbana-submissions-${new Date().toISOString().split("T")[0]}.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      bulkUpdateStatus: async (ids, status) => {
        try {
          const response = await fetch("/wp-json/urbana/v1/submissions/bulk-update", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
            },
            body: JSON.stringify({ ids, status }),
          });

          if (!response.ok) {
            throw new Error("Failed to bulk update submissions");
          }

          // Update local state
          set((state) => ({
            submissions: state.submissions.map((submission) => (ids.includes(submission.id) ? { ...submission, status } : submission)),
          }));

          get().applyFilters();
        } catch (error: any) {
          set({ error: error.message });
        }
      },
    }),
    { name: "urbana-admin-orders" }
  )
);
