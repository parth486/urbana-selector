import React from "react";
import { Tabs, Tab, Card, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ProductGroupsManager } from "./ProductGroupsManager";
import { ProductRangesManager } from "./ProductRangesManager";
import { ProductsManager } from "./ProductsManager";
import { RelationshipsManager } from "./RelationshipsManager";
import { DataPreview } from "./DataPreview";

interface DataBuilderProps {
  initialData: any;
  onDataUpdate: (data: any) => void;
}

export const DataBuilder: React.FC<DataBuilderProps> = ({ initialData, onDataUpdate }) => {
  const [data, setData] = React.useState<any>(initialData);
  const [productGroups, setProductGroups] = React.useState<any[]>([]);
  const [productRanges, setProductRanges] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [relationships, setRelationships] = React.useState<any>({
    groupToRanges: {},
    rangeToProducts: {}
  });

  // Initialize data from the provided initialData
  React.useEffect(() => {
    // Extract product groups
    const groups = initialData.stepperForm.steps[0].categories.map((name: string) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      icon: getDefaultIconForGroup(name),
      description: getDescriptionForGroup(name)
    }));
    setProductGroups(groups);

    // Extract product ranges
    const ranges: any[] = [];
    Object.entries(initialData.stepperForm.steps[1].ranges).forEach(([groupName, rangeNames]: [string, any]) => {
      rangeNames.forEach((name: string) => {
        ranges.push({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          image: "",
          description: getDescriptionForRange(name, groupName),
          tags: getTagsForRange(name, groupName)
        });
      });
    });
    setProductRanges(ranges);

    // Extract products
    const productsList: any[] = [];
    Object.entries(initialData.stepperForm.steps[2].products).forEach(([rangeName, productCodes]: [string, any]) => {
      productCodes.forEach((code: string) => {
        const productDetails = initialData.stepperForm.steps[3].productDetails[code] || null;
        productsList.push({
          id: code.toLowerCase(),
          code,
          name: productDetails?.name || `${code} Product`,
          overview: productDetails?.overview || "",
          description: productDetails?.description || "",
          specifications: productDetails?.specifications || [],
          imageGallery: productDetails?.imageGallery || [],
          files: productDetails?.files || {}
        });
      });
    });
    setProducts(productsList);

    // Extract relationships
    const groupToRanges: Record<string, string[]> = {};
    Object.entries(initialData.stepperForm.steps[1].ranges).forEach(([groupName, rangeNames]: [string, any]) => {
      const groupId = groupName.toLowerCase().replace(/\s+/g, '-');
      groupToRanges[groupId] = (rangeNames as string[]).map(name => 
        name.toLowerCase().replace(/\s+/g, '-')
      );
    });

    const rangeToProducts: Record<string, string[]> = {};
    Object.entries(initialData.stepperForm.steps[2].products).forEach(([rangeName, productCodes]: [string, any]) => {
      const rangeId = rangeName.toLowerCase().replace(/\s+/g, '-');
      rangeToProducts[rangeId] = (productCodes as string[]).map(code => 
        code.toLowerCase()
      );
    });

    setRelationships({
      groupToRanges,
      rangeToProducts
    });
  }, [initialData]);

  // Update the full data structure when any component changes
  React.useEffect(() => {
    if (productGroups.length === 0) return;

    const newData = {
      stepperForm: {
        steps: [
          {
            step: 1,
            title: "Select Product Group",
            categories: productGroups.map(group => group.name)
          },
          {
            step: 2,
            title: "Select Product Range",
            ranges: buildRangesObject()
          },
          {
            step: 3,
            title: "Select Individual Product",
            products: buildProductsObject()
          },
          {
            step: 4,
            title: "View Product Content",
            productDetails: buildProductDetailsObject()
          },
          // Keep the options step as is
          data.stepperForm.steps[4],
          // Keep the contact info step as is
          data.stepperForm.steps[5]
        ]
      }
    };

    setData(newData);
    onDataUpdate(newData);
  }, [productGroups, productRanges, products, relationships]);

  const buildRangesObject = () => {
    const rangesObj: Record<string, string[]> = {};
    
    Object.entries(relationships.groupToRanges).forEach(([groupId, rangeIds]) => {
      const group = productGroups.find(g => g.id === groupId);
      if (group) {
        rangesObj[group.name] = rangeIds.map(rangeId => {
          const range = productRanges.find(r => r.id === rangeId);
          return range ? range.name : "";
        }).filter(name => name !== "");
      }
    });
    
    return rangesObj;
  };

  const buildProductsObject = () => {
    const productsObj: Record<string, string[]> = {};
    
    Object.entries(relationships.rangeToProducts).forEach(([rangeId, productIds]) => {
      const range = productRanges.find(r => r.id === rangeId);
      if (range) {
        productsObj[range.name] = productIds.map(productId => {
          const product = products.find(p => p.id === productId);
          return product ? product.code : "";
        }).filter(code => code !== "");
      }
    });
    
    return productsObj;
  };

  const buildProductDetailsObject = () => {
    const detailsObj: Record<string, any> = {};
    
    products.forEach(product => {
      detailsObj[product.code] = {
        name: product.name,
        overview: product.overview,
        description: product.description,
        specifications: product.specifications,
        imageGallery: product.imageGallery,
        files: product.files
      };
    });
    
    return detailsObj;
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "product-configurator-data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        setData(importedData);
        onDataUpdate(importedData);
        // Re-initialize all the state with the imported data
        // This would require re-extracting everything as in the first useEffect
        // For simplicity, we'll just reload the page
        window.location.reload();
      } catch (error) {
        console.error("Error parsing imported data:", error);
        alert("Invalid data format. Please check your JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Product Data Builder</h2>
        <div className="flex gap-2">
          <Button 
            color="primary" 
            variant="flat"
            onPress={handleExportData}
            startContent={<Icon icon="lucide:download" width={18} />}
          >
            Export Data
          </Button>
          <label className="cursor-pointer">
            <Button 
              color="primary" 
              variant="flat"
              as="span"
              startContent={<Icon icon="lucide:upload" width={18} />}
            >
              Import Data
            </Button>
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleImportData}
            />
          </label>
        </div>
      </div>

      <Card>
        <Tabs aria-label="Data Builder Tabs" fullWidth>
          <Tab key="groups" title="Product Groups">
            <ProductGroupsManager 
              groups={productGroups} 
              onGroupsChange={setProductGroups} 
            />
          </Tab>
          <Tab key="ranges" title="Product Ranges">
            <ProductRangesManager 
              ranges={productRanges} 
              onRangesChange={setProductRanges} 
            />
          </Tab>
          <Tab key="products" title="Products">
            <ProductsManager 
              products={products} 
              onProductsChange={setProducts} 
            />
          </Tab>
          <Tab key="relationships" title="Relationships">
            <RelationshipsManager 
              groups={productGroups}
              ranges={productRanges}
              products={products}
              relationships={relationships}
              onRelationshipsChange={setRelationships}
            />
          </Tab>
          <Tab key="preview" title="Data Preview">
            <DataPreview data={data} />
          </Tab>
        </Tabs>
      </Card>
    </div>
  );
};

// Helper functions
function getDefaultIconForGroup(groupName: string): string {
  const iconMap: Record<string, string> = {
    "Shelter": "lucide:home",
    "Toilet": "lucide:bath",
    "Bridge": "lucide:route",
    "Access": "lucide:wheelchair",
    "Seating": "lucide:armchair",
    "Lighting": "lucide:lamp"
  };
  
  return iconMap[groupName] || "lucide:box";
}

function getDescriptionForGroup(groupName: string): string {
  const descriptions: Record<string, string> = {
    "Shelter": "Outdoor structures for shade and protection",
    "Toilet": "Public and portable sanitation facilities",
    "Bridge": "Pedestrian and light vehicle crossings",
    "Access": "Ramps, stairs, and accessibility solutions",
    "Seating": "Benches and outdoor furniture options",
    "Lighting": "Outdoor and pathway lighting solutions"
  };
  
  return descriptions[groupName] || "Product category";
}

function getDescriptionForRange(rangeName: string, groupName: string): string {
  const descriptions: Record<string, string> = {
    // Shelter ranges
    "Peninsula": "Modern shelters with excellent weather protection for parks and urban settings",
    "Whyalla": "Robust shelters designed for coastal and high-wind environments",
    "Coastal": "Corrosion-resistant designs perfect for beachfront and marine locations",
    "Urban": "Contemporary designs that blend with modern city landscapes",
    "Heritage": "Traditional designs that complement historic and cultural settings",
    
    // Toilet ranges
    "EcoSan": "Environmentally friendly composting toilet solutions with minimal water usage",
    "Standard": "Reliable and cost-effective public toilet facilities",
    "Accessible": "Fully compliant accessible toilet facilities with enhanced features",
    "Premium": "High-end toilet facilities with superior finishes and amenities",
    "Compact": "Space-saving designs for areas with limited footprint",
    
    // Bridge ranges
    "Small Span": "Compact bridges for garden paths and small water crossings",
    "Large Span": "Extended bridges for wider crossings and heavier loads",
    "Pedestrian": "Dedicated walkways designed for high foot traffic areas",
    "Decorative": "Ornamental bridges that serve as landscape features",
    "Heavy Duty": "Reinforced bridges capable of supporting maintenance vehicles",
  };
  
  return descriptions[rangeName] || `${rangeName} product range for ${groupName}`;
}

function getTagsForRange(rangeName: string, groupName: string): string[] {
  const allTags: Record<string, string[]> = {
    // Shelter ranges
    "Peninsula": ["Modern", "Weather-resistant", "Versatile"],
    "Whyalla": ["Robust", "Wind-resistant", "Durable"],
    "Coastal": ["Corrosion-resistant", "Salt-proof", "UV-stable"],
    "Urban": ["Contemporary", "Modular", "Space-efficient"],
    "Heritage": ["Traditional", "Ornate", "Classic"],
    
    // Toilet ranges
    "EcoSan": ["Eco-friendly", "Low-water", "Composting"],
    "Standard": ["Cost-effective", "Reliable", "Low-maintenance"],
    "Accessible": ["ADA Compliant", "Spacious", "Universal"],
    "Premium": ["High-end", "Enhanced features", "Superior finishes"],
    "Compact": ["Space-saving", "Efficient", "Urban-friendly"],
    
    // Bridge ranges
    "Small Span": ["Compact", "Decorative", "Easy-install"],
    "Large Span": ["Extended", "Reinforced", "Heavy-load"],
    "Pedestrian": ["High-traffic", "Safety-focused", "Accessible"],
    "Decorative": ["Ornamental", "Artistic", "Feature piece"],
    "Heavy Duty": ["Vehicle-rated", "Industrial", "Maximum strength"],
    
    // Default for other categories
    "default": ["Quality", "Durable", "Customizable"]
  };
  
  return allTags[rangeName] || allTags["default"];
}