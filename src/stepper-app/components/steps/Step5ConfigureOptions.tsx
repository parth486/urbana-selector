import React from "react";
import { Tabs, Tab, Card, CardBody, Select, SelectItem, Image } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface Step5Props {
  data: {
    options: Record<string, string[]>;
    dynamicUpdates: {
      updateImages: boolean;
      updateFiles: boolean;
    };
  };
  options: Record<string, string>;
  onOptionsChange: (options: Record<string, string>) => void;
}

export const Step5ConfigureOptions: React.FC<Step5Props> = ({
  data,
  options,
  onOptionsChange,
}) => {
  const handleOptionChange = (option: string, value: string) => {
    onOptionsChange({
      ...options,
      [option]: value,
    });
  };

  // Get a preview image based on selected options
  const getPreviewImage = React.useMemo(() => {
    // Create a unique identifier based on selected options
    const optionsString = Object.values(options).join("_");
    const hash = optionsString.length > 0 ? 
      optionsString.split("").reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0) : 0;
    
    // Use the hash to generate a unique image
    return `https://img.heroui.chat/image/landscape?w=800&h=600&u=preview_${Math.abs(hash)}`;
  }, [options]); // Only recalculate when options change

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="show"
      variants={fadeIn}
    >
      <p className="text-default-600 mb-4">
        Customize your product by selecting from the available options below:
      </p>
      
      <Tabs aria-label="Product configuration tabs" variant="underlined" color="primary">
        <Tab key="options" title="Configuration Options">
          <Card>
            <CardBody className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {Object.entries(data.options).map(([option, values]) => (
                    <div key={option} className="space-y-2">
                      <label className="text-sm font-medium text-default-700">
                        {option}
                      </label>
                      <Select
                        label={option}
                        placeholder={`Select ${option}`}
                        selectedKeys={options[option] ? [options[option]] : []}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleOptionChange(option, value);
                        }}
                        className="max-w-full"
                      >
                        {values.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>
                
                <div>
                  <div className="border border-default-200 rounded-medium p-4">
                    <h4 className="text-sm font-medium mb-2">Preview</h4>
                    <div className="aspect-video mb-4">
                      <Image
                        removeWrapper
                        alt="Product preview with selected options"
                        className="w-full h-full object-cover rounded-medium"
                        src={getPreviewImage}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-default-500">Selected Options:</h5>
                      {Object.keys(options).length > 0 ? (
                        <ul className="text-sm space-y-1">
                          {Object.entries(options).map(([option, value]) => (
                            <li key={option} className="flex items-center gap-2">
                              <Icon icon="lucide:check" className="text-success" width={14} />
                              <span className="font-medium">{option}:</span> {value}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-default-500">
                          No options selected yet. Choose from the available options.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Tab>
        
        <Tab key="impact" title="Option Impact">
          <Card>
            <CardBody className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-lg font-medium">How Options Affect Your Product</h4>
                  <p className="text-default-600">
                    Different options can impact the appearance, durability, and functionality of your product.
                    Below is a summary of how each option affects your selection.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="border-b border-default-200 pb-4">
                    <h5 className="font-medium mb-2">Post Material</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 border border-default-200 rounded-medium">
                        <div className="font-medium">Pine</div>
                        <div className="text-sm text-default-500">
                          Cost-effective, treated for outdoor use, 7-10 year lifespan
                        </div>
                      </div>
                      <div className="p-3 border border-default-200 rounded-medium">
                        <div className="font-medium">Hardwood</div>
                        <div className="text-sm text-default-500">
                          Premium appearance, naturally durable, 15-20 year lifespan
                        </div>
                      </div>
                      <div className="p-3 border border-default-200 rounded-medium">
                        <div className="font-medium">Steel</div>
                        <div className="text-sm text-default-500">
                          Maximum durability, galvanized finish, 25+ year lifespan
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-b border-default-200 pb-4">
                    <h5 className="font-medium mb-2">Roof Option</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 border border-default-200 rounded-medium">
                        <div className="font-medium">Colorbond</div>
                        <div className="text-sm text-default-500">
                          Standard metal roofing, multiple colors available, good durability
                        </div>
                      </div>
                      <div className="p-3 border border-default-200 rounded-medium">
                        <div className="font-medium">Ultra Grade</div>
                        <div className="text-sm text-default-500">
                          Premium finish with enhanced UV protection and longer warranty
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium mb-2">Screen</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 border border-default-200 rounded-medium">
                        <div className="font-medium">Rebated Front</div>
                        <div className="text-sm text-default-500">
                          Partial screen on front side for privacy while maintaining airflow
                        </div>
                      </div>
                      <div className="p-3 border border-default-200 rounded-medium">
                        <div className="font-medium">None</div>
                        <div className="text-sm text-default-500">
                          Open design with maximum visibility and airflow
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Tab>
        
        <Tab key="pricing" title="Pricing Impact">
          <Card>
            <CardBody className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-lg font-medium">Option Pricing</h4>
                  <p className="text-default-600">
                    Different configuration options affect the final price of your product.
                    Below is a breakdown of how each selection impacts pricing.
                  </p>
                </div>
                
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-default-200">
                      <th className="py-2 px-4 text-left font-medium">Option</th>
                      <th className="py-2 px-4 text-left font-medium">Selection</th>
                      <th className="py-2 px-4 text-right font-medium">Price Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.options).map(([option, values]) => (
                      <React.Fragment key={option}>
                        {values.map((value, index) => (
                          <tr key={`${option}-${value}`} className="border-b border-default-100">
                            {index === 0 ? (
                              <td className="py-2 px-4 align-top" rowSpan={values.length}>
                                {option}
                              </td>
                            ) : null}
                            <td className="py-2 px-4">
                              {value}
                              {index === 0 && <span className="text-xs text-default-400 ml-2">(Standard)</span>}
                            </td>
                            <td className="py-2 px-4 text-right">
                              {index === 0 ? (
                                "Included"
                              ) : (
                                `+$${(index * 250 + Math.random() * 100).toFixed(0)}`
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                
                <div className="bg-default-50 p-4 rounded-medium">
                  <p className="text-sm text-default-600">
                    <Icon icon="lucide:info" className="inline-block mr-2" width={16} />
                    For exact pricing including all options and installation, please complete the form
                    in the next step and our team will provide a detailed quote.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
    </motion.div>
  );
};