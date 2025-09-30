import React from "react";
import { OrdersTable } from "./components/OrdersTable";
import { OrdersFilters } from "./components/OrdersFilters";
import { OrdersStats } from "./components/OrdersStats";
import { useAdminOrdersStore } from "./stores/useAdminOrdersStore";

export default function App() {
  const { fetchSubmissions, isLoading, error } = useAdminOrdersStore();

  React.useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-danger-800">Error</h2>
            <p className="text-danger-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Customer Submissions</h1>
            <p className="text-foreground-500 mt-2">Manage and track customer product configuration requests</p>
          </div>

          <OrdersStats />

          <div className="mb-6">
            <OrdersFilters />
          </div>

          <OrdersTable />
        </div>
      </div>
    </div>
  );
}
