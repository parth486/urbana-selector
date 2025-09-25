import React from "react";
import { Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface Step1Props {
  data: {
    categories: string[];
  };
  selection: string | null;
  onSelect: (category: string) => void;
}

export const Step1ProductGroup: React.FC<Step1Props> = ({ data, selection, onSelect }) => {
  // Icons mapping for categories
  const categoryIcons: Record<string, string> = {
    "Shelter": "lucide:home",
    "Toilet": "lucide:bath",
    "Bridge": "lucide:route",
    "Access": "lucide:wheelchair",
    "Seating": "lucide:armchair",
    "Lighting": "lucide:lamp"
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div>
      <p className="text-default-600 mb-6">
        Please select a product category to begin your configuration.
      </p>
      
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {data.categories.map((category) => (
          <motion.div key={category} variants={item}>
            <Card
              isPressable
              onPress={() => onSelect(category)}
              className={`transition-all duration-200 ${
                selection === category
                  ? "border-2 border-primary shadow-md"
                  : "border border-default-200 hover:border-primary hover:shadow-sm"
              }`}
            >
              <CardBody className="flex flex-col items-center text-center p-6">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                    selection === category
                      ? "bg-primary text-white"
                      : "bg-default-100 text-default-500"
                  }`}
                >
                  <Icon icon={categoryIcons[category] || "lucide:box"} width={24} />
                </div>
                <h3 className="text-lg font-medium">{category}</h3>
                <p className="text-default-500 text-sm mt-1">
                  {getCategoryDescription(category)}
                </p>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

// Helper function to get category descriptions
function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    "Shelter": "Outdoor structures for shade and protection",
    "Toilet": "Public and portable sanitation facilities",
    "Bridge": "Pedestrian and light vehicle crossings",
    "Access": "Ramps, stairs, and accessibility solutions",
    "Seating": "Benches and outdoor furniture options",
    "Lighting": "Outdoor and pathway lighting solutions"
  };
  
  return descriptions[category] || "Product category";
}