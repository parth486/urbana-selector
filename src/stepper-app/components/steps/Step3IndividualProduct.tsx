import React from "react";
import { Card, CardBody, CardFooter, Badge } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface Step3Props {
  data: {
    products: Record<string, string[]>;
  };
  productRange: string;
  selection: string | null;
  onSelect: (product: string) => void;
}

export const Step3IndividualProduct: React.FC<Step3Props> = ({
  data,
  productRange,
  selection,
  onSelect,
}) => {
  const products = data.products[productRange] || [];

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div>
      <p className="text-default-600 mb-6">
        Select a specific product from the {productRange} range:
      </p>
      
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {products.map((product) => {
          const isSelected = selection === product;
          const productFeatures = getProductFeatures(product);
          
          return (
            <motion.div key={product} variants={item}>
              <Card
                isPressable
                onPress={() => onSelect(product)}
                className={`h-full transition-all duration-200 ${
                  isSelected
                    ? "border-2 border-primary shadow-md"
                    : "border border-default-200 hover:border-primary hover:shadow-sm"
                }`}
              >
                <CardBody className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium">{product}</h3>
                    {isSelected && (
                      <Badge color="primary" variant="flat">
                        Selected
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-default-500 text-sm">
                    {getProductDescription(product)}
                  </p>
                </CardBody>
                
                <CardFooter className="border-t border-default-100 gap-2 flex-wrap">
                  {productFeatures.map((feature) => (
                    <div 
                      key={feature.name} 
                      className="flex items-center text-xs text-default-600"
                    >
                      <Icon icon={feature.icon} className="mr-1" width={14} />
                      <span>{feature.name}</span>
                    </div>
                  ))}
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

// Helper functions
function getProductDescription(product: string): string {
  // Extract the product code pattern (letter + numbers)
  const codeMatch = product.match(/[A-Z]+\d+/);
  const code = codeMatch ? codeMatch[0] : product;
  
  // Generate descriptions based on product code
  const descriptions: Record<string, string> = {
    "K301": "Compact shelter with modern design, suitable for parks and urban settings.",
    "K302": "Medium-sized shelter with extended roof coverage for picnic areas.",
    "K308": "Large shelter with multiple seating options and enhanced weather protection.",
    "K310": "Premium shelter with architectural design elements and superior materials.",
    "K315": "Deluxe shelter with integrated seating and optional power connections.",
    "E201": "Eco-friendly toilet with composting technology and minimal water usage.",
    "E202": "Solar-powered toilet facility with self-contained waste management.",
    "SS101": "Small pedestrian bridge for garden paths and decorative water crossings.",
    "SS102": "Compact bridge with enhanced load capacity for light maintenance vehicles.",
    "R101": "ADA compliant access ramp with gentle slope and non-slip surface.",
    "R102": "Modular ramp system adaptable to various height requirements.",
  };
  
  // Return specific description or generate a generic one
  return descriptions[code] || `${product} model with standard features and customization options.`;
}

interface ProductFeature {
  name: string;
  icon: string;
}

function getProductFeatures(product: string): ProductFeature[] {
  // Extract the first letter of the product code to determine type
  const type = product.charAt(0);
  
  // Base features by product type
  const baseFeatures: Record<string, ProductFeature[]> = {
    // Shelter products (K, W, C, U, H)
    "K": [
      { name: "Weather Resistant", icon: "lucide:cloud-rain" },
      { name: "UV Protection", icon: "lucide:sun" },
      { name: "Seating Options", icon: "lucide:armchair" }
    ],
    "W": [
      { name: "Wind Resistant", icon: "lucide:wind" },
      { name: "Corrosion Proof", icon: "lucide:shield" },
      { name: "Heavy Duty", icon: "lucide:hammer" }
    ],
    "E": [
      { name: "Eco-Friendly", icon: "lucide:leaf" },
      { name: "Low Maintenance", icon: "lucide:settings-2" },
      { name: "Odor Control", icon: "lucide:fan" }
    ],
    "S": [
      { name: "Standard Compliant", icon: "lucide:check-circle" },
      { name: "Easy Clean", icon: "lucide:sparkles" },
      { name: "Vandal Resistant", icon: "lucide:shield" }
    ],
    "R": [
      { name: "ADA Compliant", icon: "lucide:wheelchair" },
      { name: "Non-Slip Surface", icon: "lucide:footprints" },
      { name: "Handrails", icon: "lucide:grip-horizontal" }
    ],
    // Default features for other types
    "default": [
      { name: "Customizable", icon: "lucide:settings" },
      { name: "Quality Materials", icon: "lucide:badge-check" },
      { name: "Warranty", icon: "lucide:shield" }
    ]
  };
  
  // Return specific features or default ones
  return baseFeatures[type] || baseFeatures["default"];
}