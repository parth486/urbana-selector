import React, { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { Tabs, Tab, Card, CardBody, Select, SelectItem } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import SecureImage from "../SecureImage";
import Lightbox from "../Lightbox";

interface Step5Props {
  data: {
    options: Record<string, Array<{ value: string; imageUrl?: string }>>;
    productOptions?: Record<string, Record<string, Array<{ value: string; imageUrl?: string }>>>;
    dynamicUpdates: {
      updateImages: boolean;
      updateFiles: boolean;
    };
  };
  options: Record<string, string>;
  onOptionsChange: (options: Record<string, string>) => void;
  selectedProductCode?: string;
}

export const Step5ConfigureOptions: React.FC<Step5Props> = ({ data, options, onOptionsChange, selectedProductCode }) => {
  const debugMode = (window as any).urbanaDebugMode || false;
  const previousProductCode = useRef<string | undefined>(selectedProductCode);
  const lastChangedOption = useRef<string | null>(null);

  // Get product-specific options or fall back to global options
  const productOptions = useMemo(() => {
    // If a product is selected, only use product-specific options
    if (selectedProductCode) {
      // Check if product has options in productOptions
      if (data.productOptions?.[selectedProductCode]) {
        return data.productOptions[selectedProductCode];
      }
      // Product selected but has no options - return empty object
      return {};
    }

    // No product selected yet - use global options as fallback
    return data.options;
  }, [selectedProductCode, data.productOptions, data.options]);

  if (debugMode) console.log(data);

  // Check if product has any options
  const hasOptions = useMemo(() => {
    return Object.keys(productOptions).length > 0;
  }, [productOptions]);

  // Filter options to only show those that belong to current product
  const filteredOptions = useMemo(() => {
    const filtered: Record<string, string> = {};
    const validOptionGroups = Object.keys(productOptions);

    // Iterate through productOptions keys to preserve order
    validOptionGroups.forEach((key) => {
      if (options[key]) {
        filtered[key] = options[key];
      }
    });

    return filtered;
  }, [options, productOptions]);

  // Clear invalid options when product changes
  useEffect(() => {
    // Only run if product code has actually changed
    if (previousProductCode.current !== selectedProductCode) {
      previousProductCode.current = selectedProductCode;

      const validOptionGroups = Object.keys(productOptions);
      const currentOptionGroups = Object.keys(options);

      const hasInvalidOptions = currentOptionGroups.some((key) => !validOptionGroups.includes(key));

      if (hasInvalidOptions || currentOptionGroups.length === 0) {
        const validOptions: Record<string, string> = {};
        currentOptionGroups.forEach((key) => {
          if (validOptionGroups.includes(key)) {
            validOptions[key] = options[key];
          }
        });

        // Only call onOptionsChange if options actually changed
        const optionsChanged = JSON.stringify(validOptions) !== JSON.stringify(options);
        if (optionsChanged) {
          onOptionsChange(validOptions);
        }
      }
    }
  }, [selectedProductCode, productOptions]);

  const handleOptionChange = useCallback(
    (option: string, value: string) => {
      lastChangedOption.current = option;
      onOptionsChange({
        ...filteredOptions,
        [option]: value,
      });
    },
    [filteredOptions, onOptionsChange]
  );

  // Get the image URL for the currently selected option
  const selectedOptionImage = useMemo(() => {
    const orderedOptionKeys = Object.keys(productOptions);

    if (orderedOptionKeys.length === 0) {
      return null;
    }

    // First, try to get image from the last changed option
    if (lastChangedOption.current && options[lastChangedOption.current]) {
      const optionConfig = productOptions[lastChangedOption.current]?.find((opt) => opt.value === options[lastChangedOption.current!]);
      if (optionConfig?.imageUrl) {
        return optionConfig.imageUrl;
      }
    }

    // Fallback: find the last selected option (in canonical order) that has an image
    for (let i = orderedOptionKeys.length - 1; i >= 0; i--) {
      const optionKey = orderedOptionKeys[i];
      const selectedValue = options[optionKey];

      if (selectedValue && productOptions[optionKey]) {
        const optionConfig = productOptions[optionKey].find((opt) => opt.value === selectedValue);
        if (optionConfig?.imageUrl) {
          return optionConfig.imageUrl;
        }
      }
    }

    return null;
  }, [options, productOptions]);

  // Get default image from product's image gallery
  const defaultProductImage = useMemo(() => {
    if (selectedProductCode && data.productDetails?.[selectedProductCode]) {
      const imageGallery = data.productDetails[selectedProductCode].imageGallery;
      if (imageGallery && imageGallery.length > 0) {
        return imageGallery[0];
      }
    }
    return "https://img.heroui.chat/image/landscape?w=800&h=600&u=preview_default";
  }, [selectedProductCode, data.productDetails]);

  // Fallback image if no option image is available
  const displayImage = selectedOptionImage || defaultProductImage;

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5 } },
  };

  if (!hasOptions) {
    return (
      <motion.div className="space-y-6" initial="hidden" animate="show" variants={fadeIn}>
        <Card>
          <CardBody className="p-8 text-center">
            <Icon icon="lucide:settings" width={48} className="text-default-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Configuration Options</h3>
            <p className="text-default-600">
              {selectedProductCode ? (
                <>
                  This product doesn't have any configurable options.
                  <span className="block mt-2 text-sm">
                    Product: <strong>{selectedProductCode}</strong>
                  </span>
                </>
              ) : (
                "Please select a product first to see available configuration options."
              )}
            </p>
            <p className="text-sm text-default-500 mt-4">
              {selectedProductCode
                ? "Proceed to the next step to complete your inquiry."
                : "Go back to the previous step and select a product."}
            </p>
          </CardBody>
        </Card>
      </motion.div>
    );
  }

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);

  const openLightboxWith = (images: string[], i = 0) => {
    setLightboxImages(images || []);
    setLightboxIndex(i);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  return (
    <motion.div className="space-y-6" initial="hidden" animate="show" variants={fadeIn}>
      {selectedProductCode && (
        <div className="flex items-center gap-2 text-sm text-default-600">
          <Icon icon="lucide:package" width={16} />
          <span>
            Configuring options for: <strong>{selectedProductCode}</strong>
          </span>
        </div>
      )}

      <p className="text-default-600 mb-4">Customize your product by selecting from the available options below:</p>

      <Tabs aria-label="Product configuration tabs" variant="underlined" color="primary">
        <Tab key="options" title="Configuration Options">
          <Card>
            <CardBody className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {Object.entries(productOptions).map(([option, values]) => (
                    <div key={option} className="space-y-2">
                      <label className="text-sm font-medium text-default-700">{option}</label>
                      <Select
                        label={option}
                        placeholder={`Select ${option}`}
                        selectedKeys={options[option] ? [options[option]] : []}
                        onChange={(e) => {
                          const value = e.target.value;
                          lastChangedOption.current = option;
                          handleOptionChange(option, value);
                        }}
                        className="max-w-full"
                      >
                        {values.map((item) => (
                          <SelectItem key={typeof item === "string" ? item : item.value}>
                            {typeof item === "string" ? item : item.value}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="border border-default-200 rounded-medium p-4">
                    <h4 className="text-sm font-medium mb-2">Preview</h4>
                    <div className="aspect-video mb-4 cursor-pointer" onClick={() => openLightboxWith([displayImage], 0)}>
                      <SecureImage
                        key={displayImage}
                        imagePath={displayImage}
                        productCode={selectedProductCode || ""}
                        className="w-full h-full object-cover rounded-medium"
                        onClick={() => openLightboxWith([displayImage], 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-default-500">Selected Options:</h5>
                      {Object.keys(filteredOptions).length > 0 ? (
                        <ul className="text-sm space-y-1">
                          {Object.entries(filteredOptions).map(([option, value]) => (
                            <li key={option} className="flex items-center gap-2">
                              <Icon icon="lucide:check" className="text-success" width={14} />
                              <span className="font-medium">{option}:</span> {value}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-default-500">No options selected yet. Choose from the available options.</p>
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
                    Different options can impact the appearance, durability, and functionality of your product. Below is a summary of how
                    each option affects your selection.
                  </p>
                </div>

                <div className="space-y-4">
                  {Object.entries(productOptions).map(([optionGroup, values]) => (
                    <div key={optionGroup} className="border-b border-default-200 pb-4 last:border-0">
                      <h5 className="font-medium mb-2">{optionGroup}</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {values.map((item, index) => {
                          const value = typeof item === "string" ? item : item.value;
                          const imageUrl = typeof item === "object" && item.imageUrl ? item.imageUrl : null;

                          return (
                            <div key={value} className="p-3 border border-default-200 rounded-medium">
                                {imageUrl && (
                                <div className="aspect-video mb-2 rounded-small overflow-hidden cursor-pointer" onClick={() => openLightboxWith([imageUrl], 0)}>
                                  <SecureImage imagePath={imageUrl} productCode={selectedProductCode || ""} className="w-full h-full object-cover" onClick={() => openLightboxWith([imageUrl], 0)} />
                                </div>
                              )}
                              <div className="font-medium">{value}</div>
                              <div className="text-sm text-default-500">
                                {index === 0 && "Standard option with included features"}
                                {index === 1 && "Enhanced durability and premium finish"}
                                {index === 2 && "Maximum performance and longevity"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
                    Different configuration options affect the final price of your product. Below is a breakdown of how each selection
                    impacts pricing.
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
                    {Object.entries(productOptions).map(([option, values]) => (
                      <React.Fragment key={option}>
                        {values.map((item, index) => {
                          const value = typeof item === "string" ? item : item.value;

                          return (
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
                                {index === 0 ? "Included" : `+$${(index * 250 + Math.random() * 100).toFixed(0)}`}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                <div className="bg-default-50 p-4 rounded-medium">
                  <p className="text-sm text-default-600">
                    <Icon icon="lucide:info" className="inline-block mr-2" width={16} />
                    For exact pricing including all options and installation, please complete the form in the next step and our team will
                    provide a detailed quote.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
        {/* Lightbox for preview/option images */}
        <Lightbox images={lightboxImages} productCode={selectedProductCode || ''} open={lightboxOpen} initialIndex={lightboxIndex} onClose={closeLightbox} />
    </motion.div>
  );
};
