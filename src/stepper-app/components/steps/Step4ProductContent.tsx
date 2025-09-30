import React from "react";
import { Tabs, Tab, Card, CardBody, Image, Accordion, AccordionItem, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface Step4Props {
  data: {
    productDetails: Record<string, ProductDetail>;
  };
  productId: string;
}

interface ProductDetail {
  name: string;
  overview: string;
  description: string;
  specifications: string[];
  imageGallery: string[];
  files: Record<string, string>;
}

export const Step4ProductContent: React.FC<Step4Props> = ({ data, productId }) => {
  const productDetails = data.productDetails[productId];
  
  // Fallback for products without detailed information
  if (!productDetails) {
    return (
      <div className="text-center p-8">
        <Icon icon="lucide:file-question" className="mx-auto mb-4 text-default-400" width={48} />
        <h3 className="text-xl font-medium mb-2">Product Information Unavailable</h3>
        <p className="text-default-500">
          Detailed information for {productId} is not available at this time.
          Please continue to the next step or contact our support team for assistance.
        </p>
      </div>
    );
  }

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <motion.div 
      className="space-y-8"
      initial="hidden"
      animate="show"
      variants={fadeIn}
    >
      {/* Product header */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/2">
          <Image
            removeWrapper
            alt={productDetails.name}
            className="w-full h-64 object-cover rounded-medium"
            src={`https://img.heroui.chat/image/${getImageCategory(productId)}?w=600&h=400&u=${productId}_main`}
          />
        </div>
        
        <div className="w-full md:w-1/2">
          <h3 className="text-xl font-semibold mb-2">{productDetails.name}</h3>
          <p className="text-default-600 mb-4">{productDetails.overview}</p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:check-circle" className="text-success" width={20} />
              <span>In Stock</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="lucide:truck" className="text-default-500" width={20} />
              <span>Standard Delivery: 2-4 weeks</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="lucide:shield" className="text-default-500" width={20} />
              <span>10 Year Warranty</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Product content tabs */}
      <Tabs aria-label="Product information tabs" variant="underlined" color="primary">
        <Tab key="details" title="Details">
          <Card>
            <CardBody className="p-6">
              <div className="prose max-w-none">
                <p className="text-default-700">{productDetails.description}</p>
                
                <h4 className="text-lg font-medium mt-6 mb-3">Specifications</h4>
                <ul className="space-y-2">
                  {productDetails.specifications.map((spec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Icon icon="lucide:chevron-right" className="text-primary mt-1 flex-shrink-0" width={16} />
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardBody>
          </Card>
        </Tab>
        
        <Tab key="gallery" title="Image Gallery">
          <Card>
            <CardBody className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {productDetails.imageGallery.map((image, index) => (
                  <div key={index} className="aspect-square">
                    <Image
                      removeWrapper
                      alt={`${productDetails.name} - Image ${index + 1}`}
                      className="w-full h-full object-cover rounded-medium"
                      src={`https://img.heroui.chat/image/${image}?w=400&h=400&u=${productId}_${index}`}
                    />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </Tab>
        
        <Tab key="files" title="Downloads">
          <Card>
            <CardBody className="p-6">
              <div className="space-y-4">
                <p className="text-default-600 mb-4">
                  Download product documentation and technical files:
                </p>
                
                <div className="space-y-3">
                  {Object.entries(productDetails.files).map(([name, file]) => (
                    <div 
                      key={file}
                      className="flex items-center justify-between p-3 border border-default-200 rounded-medium hover:border-primary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-default-100 rounded-medium">
                          <Icon 
                            icon={getFileIcon(file)} 
                            className="text-default-600" 
                            width={20} 
                          />
                        </div>
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-xs text-default-500">{getFileSize(file)}</p>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        onPress={() => console.log(`Downloading ${file}`)}
                        endContent={<Icon icon="lucide:download" width={16} />}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </Tab>
        
        <Tab key="faq" title="FAQ">
          <Card>
            <CardBody className="p-6">
              <Accordion>
                <AccordionItem key="1" title="What is the installation process?">
                  Installation typically requires a concrete foundation and can be completed by our certified installers. 
                  The process usually takes 1-3 days depending on the product complexity and site conditions.
                </AccordionItem>
                <AccordionItem key="2" title="What maintenance is required?">
                  Our products are designed for minimal maintenance. We recommend a visual inspection every 6 months 
                  and cleaning as needed. Specific maintenance schedules are provided in the product documentation.
                </AccordionItem>
                <AccordionItem key="3" title="Are customizations available?">
                  Yes, most products can be customized with different colors, materials, and additional features. 
                  Custom options can be selected in the next step of this configuration process.
                </AccordionItem>
                <AccordionItem key="4" title="What warranty is provided?">
                  Standard warranty is 10 years on structural components and 5 years on other elements. 
                  Extended warranties are available for purchase. All warranties cover manufacturing defects and normal wear.
                </AccordionItem>
              </Accordion>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
    </motion.div>
  );
};

// Helper functions
function getImageCategory(productId: string): string {
  // Determine image category based on product ID prefix
  const prefix = productId.charAt(0);
  
  const mapping: Record<string, string> = {
    "K": "landscape", // Peninsula shelters
    "W": "landscape", // Whyalla shelters
    "C": "landscape", // Coastal shelters
    "U": "landscape", // Urban shelters
    "H": "landscape", // Heritage shelters
    "E": "places",    // EcoSan toilets
    "S": "places",    // Standard toilets
    "A": "places",    // Accessible toilets
    "P": "places",    // Premium toilets
    "SS": "landscape", // Small Span bridges
    "LS": "landscape", // Large Span bridges
    "R": "places",    // Ramps
    "ST": "places",   // Staircases
    "B": "furniture", // Benches
    "TS": "furniture", // Table Settings
    "SL": "places",   // Solar lighting
    "MP": "places",   // Mains Powered lighting
  };
  
  // Default to places if no specific mapping
  return mapping[prefix] || "places";
}

function getFileIcon(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const iconMap: Record<string, string> = {
    "pdf": "lucide:file-text",
    "dwg": "lucide:file-cog",
    "rvt": "lucide:file-3d",
    "doc": "lucide:file-text",
    "docx": "lucide:file-text",
    "xls": "lucide:file-spreadsheet",
    "xlsx": "lucide:file-spreadsheet",
    "zip": "lucide:file-archive",
    "default": "lucide:file"
  };
  
  return iconMap[extension || ""] || iconMap["default"];
}

function getFileSize(filename: string): string {
  // Simulate file sizes based on file type
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const sizes: Record<string, string> = {
    "pdf": "2.4 MB",
    "dwg": "5.8 MB",
    "rvt": "12.6 MB",
    "doc": "1.2 MB",
    "docx": "1.5 MB",
    "xls": "3.1 MB",
    "xlsx": "3.4 MB",
    "zip": "8.7 MB",
    "default": "1.0 MB"
  };
  
  return sizes[extension || ""] || sizes["default"];
}