import React, { useMemo } from "react";
import { Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface ProductGroup {
  id: string;
  name: string;
  icon: string;
  description: string;
  active?: boolean;
}

interface Step1Props {
  data: {
    categories: string[];
    productGroups?: ProductGroup[]; // Add product groups data
  };
  selection: string | null;
  onSelect: (category: string) => void;
}

export const Step1ProductGroup: React.FC<Step1Props> = ({ data, selection, onSelect }) => {
  // Get product group data from database or fallback to hardcoded
  const getProductGroupData = (categoryName: string): ProductGroup => {
    console.log("data.productGroups", data.productGroups);
    if (data.productGroups) {
      // Filter only active product groups
      const activeProductGroups = data.productGroups?.filter((group) => group.active !== false) || [];

      const foundGroup = activeProductGroups.find((group) => group.name === categoryName);
      console.log("foundGroup", foundGroup);
      if (foundGroup) {
        return foundGroup;
      }
    }

    // Fallback to default data if not found in database
    return {
      id: categoryName.toLowerCase().replace(/\s+/g, "-"),
      name: categoryName,
      icon: getDefaultCategoryIcon(categoryName),
      description: getDefaultCategoryDescription(categoryName),
    };
  };

  const activeProductGroups = useMemo(() => {
    if (data.productGroups && Array.isArray(data.productGroups)) {
      return data.productGroups.filter((group) => group.active !== false);
    }
    // Fallback to legacy categories if productGroups not available
    return (
      data.categories?.map((category) => ({
        id: category.toLowerCase().replace(/\s+/g, "-"),
        name: category,
        icon: getDefaultCategoryIcon(category),
        description: getDefaultCategoryDescription(category),
        active: true,
      })) || []
    );
  }, [data.productGroups, data.categories]);

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div>
      <p className="text-default-600 mb-6">Please select a product category to begin your configuration.</p>

      <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" variants={container} initial="hidden" animate="show">
        {activeProductGroups.map((group) => {
          return (
            <motion.div key={group.id} variants={item}>
              <Card
                isPressable
                onPress={() => onSelect(group.name)}
                className={`transition-all duration-200 ${
                  selection === group.name
                    ? "border-2 border-primary shadow-md"
                    : "border border-default-200 hover:border-primary hover:shadow-sm"
                }`}
              >
                <CardBody className="flex flex-col items-center text-center p-6">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                      selection === group.name ? "bg-primary text-white" : "bg-default-100 text-default-500"
                    }`}
                  >
                    <Icon icon={group.icon} width={24} />
                  </div>
                  <h3 className="text-lg font-medium">{group.name}</h3>
                  <p className="text-default-500 text-sm mt-1">{group.description}</p>
                </CardBody>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

// Fallback functions for when data is not in database
function getDefaultCategoryIcon(category: string): string {
  const categoryIcons: Record<string, string> = {
    Shelter: "lucide:home",
    Toilet: "lucide:bath",
    Bridge: "lucide:route",
    Access: "lucide:wheelchair",
    Seating: "lucide:armchair",
    Lighting: "lucide:lamp",
  };

  return categoryIcons[category] || "lucide:box";
}

function getDefaultCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    Shelter: "Outdoor structures for shade and protection",
    Toilet: "Public and portable sanitation facilities",
    Bridge: "Pedestrian and light vehicle crossings",
    Access: "Ramps, stairs, and accessibility solutions",
    Seating: "Benches and outdoor furniture options",
    Lighting: "Outdoor and pathway lighting solutions",
  };

  return descriptions[category] || "Product category";
}
