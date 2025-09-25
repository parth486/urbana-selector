import React from "react";
import { Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAdminOrdersStore } from "../stores/useAdminOrdersStore";

export const OrdersStats: React.FC = () => {
  const { submissions, filteredSubmissions } = useAdminOrdersStore();

  const stats = React.useMemo(() => {
    const total = submissions.length;
    const newSubmissions = submissions.filter((s) => s.status === "new").length;
    const inProgress = submissions.filter((s) => ["viewed", "contacted"].includes(s.status)).length;
    const completed = submissions.filter((s) => s.status === "completed").length;
    const highPriority = submissions.filter((s) => s.priority === "high").length;

    return [
      {
        label: "Total Submissions",
        value: total,
        icon: "heroicons:document-text",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      },
      {
        label: "New",
        value: newSubmissions,
        icon: "heroicons:bell",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      },
      {
        label: "In Progress",
        value: inProgress,
        icon: "heroicons:clock",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
      },
      {
        label: "Completed",
        value: completed,
        icon: "heroicons:check-circle",
        color: "text-green-600",
        bgColor: "bg-green-50",
      },
      {
        label: "High Priority",
        value: highPriority,
        icon: "heroicons:exclamation-triangle",
        color: "text-red-600",
        bgColor: "bg-red-50",
      },
    ];
  }, [submissions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      {stats.map((stat) => (
        <Card key={stat.label} className="shadow-sm">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <Icon icon={stat.icon} className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};
