import React from "react";
import { Card, CardBody, Input, Select, SelectItem, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAdminOrdersStore } from "../stores/useAdminOrdersStore";

export const OrdersFilters: React.FC = () => {
  const { statusFilter, priorityFilter, searchQuery, setStatusFilter, setPriorityFilter, setSearchQuery, exportSubmissions } =
    useAdminOrdersStore();

  const statusOptions = [
    { key: "all", label: "All Status" },
    { key: "new", label: "New" },
    { key: "viewed", label: "Viewed" },
    { key: "contacted", label: "Contacted" },
    { key: "completed", label: "Completed" },
    { key: "archived", label: "Archived" },
  ];

  const priorityOptions = [
    { key: "all", label: "All Priorities" },
    { key: "low", label: "Low Priority" },
    { key: "medium", label: "Medium Priority" },
    { key: "high", label: "High Priority" },
  ];

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      await exportSubmissions(format);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardBody className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1 min-w-64">
              <Input
                type="text"
                placeholder="Search submissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<Icon icon="heroicons:magnifying-glass" className="w-4 h-4 text-gray-400" />}
                isClearable
                onClear={() => setSearchQuery("")}
              />
            </div>

            <Select
              placeholder="Filter by status"
              selectedKeys={[statusFilter]}
              onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] as string)}
              className="min-w-48"
            >
              {statusOptions.map((option) => (
                <SelectItem key={option.key}>{option.label}</SelectItem>
              ))}
            </Select>

            <Select
              placeholder="Filter by priority"
              selectedKeys={[priorityFilter]}
              onSelectionChange={(keys) => setPriorityFilter(Array.from(keys)[0] as string)}
              className="min-w-48"
            >
              {priorityOptions.map((option) => (
                <SelectItem key={option.key}>{option.label}</SelectItem>
              ))}
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="flat"
              size="sm"
              startContent={<Icon icon="heroicons:arrow-down-tray" className="w-4 h-4" />}
              onPress={() => handleExport("csv")}
            >
              Export CSV
            </Button>
            <Button
              variant="flat"
              size="sm"
              startContent={<Icon icon="heroicons:arrow-down-tray" className="w-4 h-4" />}
              onPress={() => handleExport("xlsx")}
            >
              Export Excel
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
