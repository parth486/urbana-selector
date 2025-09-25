import React from "react";
import { Card, CardBody, Image } from "@heroui/react";
import { motion } from "framer-motion";

interface Step2Props {
  data: {
    ranges: Record<string, string[]>;
  };
  productGroup: string;
  selection: string | null;
  onSelect: (range: string) => void;
}

export const Step2ProductRange: React.FC<Step2Props> = ({ data, productGroup, selection, onSelect }) => {
  const ranges = data.ranges[productGroup] || [];

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
      <p className="text-default-600 mb-6">Select a product range from the {productGroup} category:</p>

      <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" variants={container} initial="hidden" animate="show">
        {ranges.map((range, index) => (
          <motion.div key={range} variants={item}>
            <Card
              isPressable
              onPress={() => onSelect(range)}
              className={`transition-all duration-200 ${
                selection === range ? "border-2 border-primary shadow-md" : "border border-default-200 hover:border-primary hover:shadow-sm"
              }`}
            >
              <CardBody className="p-0">
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-1/3 h-40">
                    <Image
                      removeWrapper
                      alt={`${range} product range`}
                      className="w-full h-full object-cover"
                      src={`https://img.heroui.chat/image/${getImageCategory(productGroup)}?w=300&h=300&u=${productGroup}_${index}`}
                    />
                  </div>
                  <div className="p-4 flex-1">
                    <h3 className="text-lg font-medium">{range}</h3>
                    <p className="text-default-500 text-sm mt-2">{getRangeDescription(range, productGroup)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getFeatureTags(range, productGroup).map((tag) => (
                        <span key={tag} className="text-xs px-2 py-1 bg-default-100 text-default-700 rounded-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

// Helper functions
function getImageCategory(productGroup: string): string {
  const mapping: Record<string, string> = {
    Shelter: "landscape",
    Toilet: "places",
    Bridge: "landscape",
    Access: "places",
    Seating: "furniture",
    Lighting: "places",
  };

  return mapping[productGroup] || "places";
}

function getRangeDescription(range: string, productGroup: string): string {
  const descriptions: Record<string, string> = {
    // Shelter ranges
    Peninsula: "Modern shelters with excellent weather protection for parks and urban settings",
    Whyalla: "Robust shelters designed for coastal and high-wind environments",
    Coastal: "Corrosion-resistant designs perfect for beachfront and marine locations",
    Urban: "Contemporary designs that blend with modern city landscapes",
    Heritage: "Traditional designs that complement historic and cultural settings",

    // Toilet ranges
    EcoSan: "Environmentally friendly composting toilet solutions with minimal water usage",
    Standard: "Reliable and cost-effective public toilet facilities",
    Accessible: "Fully compliant accessible toilet facilities with enhanced features",
    Premium: "High-end toilet facilities with superior finishes and amenities",
    Compact: "Space-saving designs for areas with limited footprint",

    // Bridge ranges
    "Small Span": "Compact bridges for garden paths and small water crossings",
    "Large Span": "Extended bridges for wider crossings and heavier loads",
    Pedestrian: "Dedicated walkways designed for high foot traffic areas",
    "Decorative Bridge": "Ornamental bridges that serve as landscape features",
    "Heavy Duty": "Reinforced bridges capable of supporting maintenance vehicles",

    // Access ranges
    Ramp: "Gentle slope access solutions for wheelchairs and strollers",
    Staircase: "Step access with various configurations and safety features",
    Pathway: "Connected walkway systems for parks and public spaces",
    Boardwalk: "Elevated walkways for wetlands and sensitive environments",
    Platform: "Viewing platforms and elevated observation areas",

    // Seating ranges
    Bench: "Traditional seating options for parks and public spaces",
    "Table Setting": "Combined table and seating arrangements for picnic areas",
    Lounge: "Comfortable extended seating for relaxation areas",
    Stadium: "Tiered seating solutions for sports and event venues",
    Custom: "Bespoke seating arrangements designed to specification",

    // Lighting ranges
    Solar: "Self-sufficient lighting powered by renewable energy",
    "Mains Powered": "Connected lighting solutions with reliable performance",
    "Decorative Light": "Aesthetic lighting features that enhance landscapes",
    Security: "High visibility lighting for safety and security",
    "Pathway Light": "Directional lighting for walkways and pedestrian areas",
  };

  return descriptions[range] || `${range} product range for ${productGroup}`;
}

function getFeatureTags(range: string, productGroup: string): string[] {
  const allTags: Record<string, string[]> = {
    // Shelter ranges
    Peninsula: ["Modern", "Weather-resistant", "Versatile"],
    Whyalla: ["Robust", "Wind-resistant", "Durable"],
    Coastal: ["Corrosion-resistant", "Salt-proof", "UV-stable"],
    Urban: ["Contemporary", "Modular", "Space-efficient"],
    Heritage: ["Traditional", "Ornate", "Classic"],

    // Toilet ranges
    EcoSan: ["Eco-friendly", "Low-water", "Composting"],
    Standard: ["Cost-effective", "Reliable", "Low-maintenance"],
    Accessible: ["ADA Compliant", "Spacious", "Universal"],
    Premium: ["High-end", "Enhanced features", "Superior finishes"],
    Compact: ["Space-saving", "Efficient", "Urban-friendly"],

    // Bridge ranges
    "Small Span": ["Compact", "Decorative", "Easy-install"],
    "Large Span": ["Extended", "Reinforced", "Heavy-load"],
    Pedestrian: ["High-traffic", "Safety-focused", "Accessible"],
    Decorative: ["Ornamental", "Artistic", "Feature piece"],
    "Heavy Duty": ["Vehicle-rated", "Industrial", "Maximum strength"],

    // Default for other categories
    default: ["Quality", "Durable", "Customizable"],
  };

  return allTags[range] || allTags["default"];
}
