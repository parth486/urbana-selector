import React, { useMemo } from "react";
import { Card, CardBody, CardFooter, Badge } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface Product {
  id: string;
  code: string;
  name: string;
  overview: string;
  description: string;
  specifications: string[];
  imageGallery: string[];
  files: Record<string, string>;
  active?: boolean;
}

interface Step3Props {
  data: {
    products: Record<string, string[]>;
    productsData?: Product[]; // Changed from products to productsData to match FrontendInit.php
    relationships?: {
      rangeToProducts: Record<string, string[]>;
    };
  };
  productRange: string;
  selection: string | null;
  onSelect: (product: string) => void;
}

export const Step3IndividualProduct: React.FC<Step3Props> = ({ data, productRange, selection, onSelect }) => {
  const products = data.products[productRange] || [];

  // Get product data from database or fallback to hardcoded
  const getProductData = (productCode: string): Product => {
    if (data.productsData && Array.isArray(data.productsData)) {
      const foundProduct = data.productsData.find((product) => product.code === productCode);
      if (foundProduct) {
        return foundProduct;
      }
    }

    // Fallback to default data if not found in database
    return {
      id: productCode.toLowerCase(),
      code: productCode,
      name: `${productCode} Product`,
      overview: getDefaultProductDescription(productCode),
      description: getDefaultProductDescription(productCode),
      specifications: [],
      imageGallery: [],
      files: {},
    };
  };

  const activeProducts = useMemo(() => {
    if (data.productsData && data.relationships) {
      // Find the range ID for the selected product range
      const rangeId = productRange.toLowerCase().replace(/\s+/g, "-");
      const productIds = data.relationships.rangeToProducts[rangeId] || [];

      // Filter products by range and active status
      return data.productsData.filter((product) => productIds.includes(product.id) && product.active !== false);
    }

    // Fallback to legacy products structure
    const legacyProducts = data.products?.[productRange] || [];
    return legacyProducts.map((productCode) => ({
      id: productCode.toLowerCase(),
      code: productCode,
      name: `${productCode} Product`,
      overview: getDefaultProductDescription(productCode),
      description: getDefaultProductDescription(productCode),
      specifications: [],
      imageGallery: [],
      files: {},
      active: true,
    }));
  }, [data.productsData, data.relationships, data.products, productRange]);

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div>
      <p className="text-default-600 mb-6">Select a specific product from the {productRange} range:</p>

      <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" variants={container} initial="hidden" animate="show">
        {activeProducts.map((product) => {
          const isSelected = selection === product.code;
          const hasImage = product.imageGallery.length > 0;

          return (
            <motion.div key={product.id} variants={item}>
              <Card
                isPressable
                onPress={() => onSelect(product.code)}
                className={`h-full w-full transition-all duration-200 ${
                  isSelected ? "border-2 border-primary shadow-md" : "border border-default-200 hover:border-primary hover:shadow-sm"
                }`}
              >
                <CardBody className="p-4">
                  <div className="flex items-center justify-center mb-3">
                    <h3 className="text-lg font-medium">{product.name}</h3>
                  </div>

                  <p className="text-default-500 text-sm text-center">{product.overview || product.description}</p>

                  {product.specifications.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-default-700 text-center">Key Features:</p>
                      <div className="text-xs text-default-500">
                        {product.specifications.slice(0, 3).map((spec, index) => (
                          <div key={index} className="flex items-start justify-center">
                            <Icon icon="lucide:check" width={14} className="mr-1 mt-0.5 text-success" />
                            <span>{spec}</span>
                          </div>
                        ))}
                        {product.specifications.length > 3 && (
                          <div className="text-default-400 mt-1">+{product.specifications.length - 3} more features</div>
                        )}
                      </div>
                    </div>
                  )}
                </CardBody>

                {Object.keys(product.files).length > 0 && (
                  <CardFooter className="border-t border-default-100 px-4 py-2 justify-center">
                    <div className="flex items-center gap-2 text-xs text-default-600">
                      <Icon icon="lucide:file-text" width={14} />
                      <span>
                        {Object.keys(product.files).length} document{Object.keys(product.files).length !== 1 ? "s" : ""} available
                      </span>
                    </div>
                  </CardFooter>
                )}
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

// ...existing helper functions remain the same...
function getDefaultProductDescription(product: string): string {
  // Extract the product code pattern (letter + numbers)
  const codeMatch = product.match(/[A-Z]+\d+/);
  const code = codeMatch ? codeMatch[0] : product;

  // Generate descriptions based on product code
  const descriptions: Record<string, string> = {
    K301: "Compact shelter with modern design, suitable for parks and urban settings.",
    K302: "Medium-sized shelter with extended roof coverage for picnic areas.",
    K308: "Large shelter with multiple seating options and enhanced weather protection.",
    K310: "Premium shelter with architectural design elements and superior materials.",
    K315: "Deluxe shelter with integrated seating and optional power connections.",
    E201: "Eco-friendly toilet with composting technology and minimal water usage.",
    E202: "Solar-powered toilet facility with self-contained waste management.",
    SS101: "Small pedestrian bridge for garden paths and decorative water crossings.",
    SS102: "Compact bridge with enhanced load capacity for light maintenance vehicles.",
    R101: "ADA compliant access ramp with gentle slope and non-slip surface.",
    R102: "Modular ramp system adaptable to various height requirements.",
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
    K: [
      { name: "Weather Resistant", icon: "lucide:cloud-rain" },
      { name: "UV Protection", icon: "lucide:sun" },
      { name: "Seating Options", icon: "lucide:armchair" },
    ],
    W: [
      { name: "Wind Resistant", icon: "lucide:wind" },
      { name: "Corrosion Proof", icon: "lucide:shield" },
      { name: "Heavy Duty", icon: "lucide:hammer" },
    ],
    E: [
      { name: "Eco-Friendly", icon: "lucide:leaf" },
      { name: "Low Maintenance", icon: "lucide:settings-2" },
      { name: "Odor Control", icon: "lucide:fan" },
    ],
    S: [
      { name: "Standard Compliant", icon: "lucide:check-circle" },
      { name: "Easy Clean", icon: "lucide:sparkles" },
      { name: "Vandal Resistant", icon: "lucide:shield" },
    ],
    R: [
      { name: "ADA Compliant", icon: "lucide:wheelchair" },
      { name: "Non-Slip Surface", icon: "lucide:footprints" },
      { name: "Handrails", icon: "lucide:grip-horizontal" },
    ],
    // Default features for other types
    default: [
      { name: "Customizable", icon: "lucide:settings" },
      { name: "Quality Materials", icon: "lucide:badge-check" },
      { name: "Warranty", icon: "lucide:shield" },
    ],
  };

  // Return specific features or default ones
  return baseFeatures[type] || baseFeatures["default"];
}
