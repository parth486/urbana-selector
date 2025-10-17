import React, { useMemo, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Tabs,
  Tab,
  Accordion,
  AccordionItem,
  Chip,
  Avatar,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataBuilderStore, ProductDataStructure } from "../../stores/useDataBuilderStore";

export const DataPreview: React.FC = () => {
  const { productGroups, productRanges, products, relationships, exportData, importData } = useDataBuilderStore();

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [importText, setImportText] = React.useState("");
  const [exportedData, setExportedData] = React.useState<string>("");
  const [previewMode, setPreviewMode] = React.useState<"structure" | "json">("structure");

  // Generate the stepper configuration using the exportData function
  const stepperConfig = useMemo(() => exportData(), [exportData]);

  // Calculate all products across all steps with their options
  const allProductsByCategory = useMemo(() => {
    const productsByCategory: Record<string, any[]> = {};

    stepperConfig.stepperForm.steps.forEach((step) => {
      // Step 3 contains the products organized by range
      if (step.step === 3 && step.products) {
        Object.entries(step.products).forEach(([rangeName, productCodes]) => {
          if (!productsByCategory[rangeName]) {
            productsByCategory[rangeName] = [];
          }

          // For each product code, get full product details from step 4
          (productCodes as string[]).forEach((productCode) => {
            const productDetails = stepperConfig.stepperForm.steps[3]?.productDetails?.[productCode];
            const productOptions = stepperConfig.stepperForm.steps[4]?.productOptions?.[productCode];

            if (productDetails) {
              productsByCategory[rangeName].push({
                code: productCode,
                ...productDetails,
                options: productOptions || {},
                hasOptions: productOptions && Object.keys(productOptions).length > 0,
              });
            }
          });
        });
      }
    });

    return productsByCategory;
  }, [stepperConfig]);

  const stats = useMemo(() => {
    const totalProducts = Object.values(allProductsByCategory).reduce((sum, products) => sum + products.length, 0);

    const productsWithOptions = Object.values(allProductsByCategory).reduce(
      (sum, products) => sum + products.filter((p: any) => p.hasOptions).length,
      0
    );

    return {
      totalSteps: stepperConfig.stepperForm.steps.length,
      totalCategories: Object.keys(allProductsByCategory).length,
      totalProducts,
      productsWithOptions,
      hasIssues: stepperConfig.stepperForm.steps[1]?.ranges && Object.keys(stepperConfig.stepperForm.steps[1].ranges).length === 0,
    };
  }, [stepperConfig, allProductsByCategory]);

  const handleExport = useCallback(() => {
    const data = exportData();
    setExportedData(JSON.stringify(data, null, 2));
    setPreviewMode("json");
  }, [exportData]);

  const handleImport = useCallback(() => {
    try {
      const data = JSON.parse(importText);
      importData(data);
      setImportText("");
      onClose();
    } catch (error) {
      alert("Invalid JSON format. Please check your data.");
    }
  }, [importText, importData, onClose]);

  const downloadConfig = useCallback(() => {
    const config = exportData();
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = "stepper-config.json";
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  }, [exportData]);

  const copyToClipboard = useCallback(() => {
    const config = exportData();
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    // Toast notification would be shown here if implemented
  }, [exportData]);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold">Data Preview</h3>
          <p className="text-sm text-foreground-500">Preview and export your stepper configuration</p>
        </div>
        <div className="flex gap-2">
          <Button variant="flat" onPress={onOpen} startContent={<Icon icon="lucide:upload" width={18} />}>
            Import
          </Button>
          <Button color="secondary" onPress={handleExport} startContent={<Icon icon="lucide:download" width={18} />}>
            Export Data
          </Button>
          <Button color="primary" onPress={downloadConfig} startContent={<Icon icon="lucide:file-down" width={18} />}>
            Download Config
          </Button>
        </div>
      </div>

      {/* Configuration Stats */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.totalSteps}</div>
              <div className="text-sm text-foreground-500">Stepper Steps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary-600">{stats.totalCategories}</div>
              <div className="text-sm text-foreground-500">Ranges</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600">{stats.totalProducts}</div>
              <div className="text-sm text-foreground-500">Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning-600">{stats.productsWithOptions}</div>
              <div className="text-sm text-foreground-500">With Options</div>
            </div>
            <div className="text-center">
              <div className={`flex justify-center text-2xl font-bold ${stats.hasIssues ? "text-warning-600" : "text-success-600"}`}>
                {stats.hasIssues ? <Icon icon="lucide:alert-triangle" width={32} /> : <Icon icon="lucide:check-circle" width={32} />}
              </div>
              <div className="text-sm text-foreground-500">{stats.hasIssues ? "Has Issues" : "Ready"}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Tabs aria-label="Preview Options" selectedKey={previewMode} onSelectionChange={(key) => setPreviewMode(key as "structure" | "json")}>
        <Tab
          key="structure"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="lucide:layers" width={16} />
              Structure Preview
            </div>
          }
        >
          <div className="space-y-6">
            {/* Stepper Steps Preview */}
            <Card>
              <CardHeader>
                <h4 className="font-semibold flex items-center gap-2">
                  <Icon icon="lucide:list" width={16} />
                  Stepper Steps
                </h4>
              </CardHeader>
              <CardBody>
                {stepperConfig.stepperForm.steps.length === 0 ? (
                  <div className="text-center py-8">
                    <Icon icon="lucide:layers" width={48} className="mx-auto text-foreground-300 mb-4" />
                    <p className="text-foreground-600">No stepper steps configured</p>
                    <p className="text-sm text-foreground-500">Create product groups to generate stepper steps</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stepperConfig.stepperForm.steps.map((step) => (
                      <div key={step.step} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-primary-600">{step.step}</span>
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold">{step.title}</h5>
                          {step.step === 1 && step.categories && step.categories.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {step.categories.map((category, index) => (
                                <Chip key={index} size="sm" variant="flat" color="secondary">
                                  {category}
                                </Chip>
                              ))}
                            </div>
                          )}
                          {step.step === 2 && step.ranges && Object.keys(step.ranges).length > 0 && (
                            <p className="text-sm text-foreground-500 mt-1">{Object.keys(step.ranges).length} group(s) with ranges</p>
                          )}
                          {step.step === 3 && step.products && Object.keys(step.products).length > 0 && (
                            <p className="text-sm text-foreground-500 mt-1">{Object.keys(step.products).length} range(s) with products</p>
                          )}
                          {step.step === 4 && step.productDetails && Object.keys(step.productDetails).length > 0 && (
                            <p className="text-sm text-foreground-500 mt-1">{Object.keys(step.productDetails).length} product detail(s)</p>
                          )}
                          {step.step === 5 && (
                            <div className="flex gap-2 mt-1">
                              {step.options && Object.keys(step.options).length > 0 && (
                                <Chip size="sm" variant="flat" color="primary">
                                  {Object.keys(step.options).length} global option group(s)
                                </Chip>
                              )}
                              {step.productOptions && Object.keys(step.productOptions).length > 0 && (
                                <Chip size="sm" variant="flat" color="warning">
                                  {Object.keys(step.productOptions).length} product(s) with options
                                </Chip>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Products by Range */}
            <Card>
              <CardHeader>
                <h4 className="font-semibold flex items-center gap-2">
                  <Icon icon="lucide:package" width={16} />
                  Products by Range
                </h4>
              </CardHeader>
              <CardBody>
                {Object.keys(allProductsByCategory).length === 0 ? (
                  <div className="text-center py-8">
                    <Icon icon="lucide:package" width={48} className="mx-auto text-foreground-300 mb-4" />
                    <p className="text-foreground-600">No products configured</p>
                    <p className="text-sm text-foreground-500">Link products to ranges to see them here</p>
                  </div>
                ) : (
                  <Accordion variant="bordered">
                    {Object.entries(allProductsByCategory).map(([rangeName, rangeProducts]) => (
                      <AccordionItem
                        key={rangeName}
                        title={
                          <div className="flex items-center gap-3">
                            <Avatar
                              icon={<Icon icon="lucide:grid-3x3" width={16} />}
                              className="w-6 h-6 bg-secondary-100 text-secondary-600"
                            />
                            <span className="font-medium">{rangeName}</span>
                            <Chip size="sm" variant="flat" color="secondary">
                              {rangeProducts.length} product{rangeProducts.length !== 1 ? "s" : ""}
                            </Chip>
                            {rangeProducts.some((p: any) => p.hasOptions) && (
                              <Chip size="sm" variant="flat" color="warning">
                                {rangeProducts.filter((p: any) => p.hasOptions).length} with options
                              </Chip>
                            )}
                          </div>
                        }
                      >
                        <div className="space-y-3 pl-4">
                          {rangeProducts.map((product: any) => (
                            <div key={product.code} className="border-l-2 border-success-200 pl-4">
                              <div className="flex items-start gap-3">
                                <Avatar
                                  icon={<Icon icon="lucide:package" width={16} />}
                                  className="w-8 h-8 bg-success-100 text-success-600 mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h6 className="font-semibold">{product.name}</h6>
                                    <Chip size="sm" variant="flat" color="success">
                                      {product.code}
                                    </Chip>
                                    {product.hasOptions && (
                                      <Chip
                                        size="sm"
                                        variant="flat"
                                        color="warning"
                                        startContent={<Icon icon="lucide:settings" width={12} />}
                                      >
                                        {Object.keys(product.options).length} option groups
                                      </Chip>
                                    )}
                                  </div>
                                  <p className="text-sm text-foreground-600 mb-2">{product.overview}</p>

                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                                    <div>
                                      <span className="font-medium text-foreground-700">Specifications:</span>
                                      <span className="text-foreground-500 ml-1">{product.specifications?.length || 0}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-foreground-700">Images:</span>
                                      <span className="text-foreground-500 ml-1">{product.imageGallery?.length || 0}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-foreground-700">Files:</span>
                                      <span className="text-foreground-500 ml-1">{Object.keys(product.files || {}).length}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-foreground-700">Options:</span>
                                      <span className="text-foreground-500 ml-1">
                                        {product.hasOptions ? Object.keys(product.options).length : "None"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Display option groups if available */}
                                  {product.hasOptions && (
                                    <div className="mt-3 p-3 bg-warning-50 rounded-medium border border-warning-200">
                                      <h6 className="text-xs font-semibold text-warning-800 mb-2 flex items-center gap-1">
                                        <Icon icon="lucide:settings" width={12} />
                                        Configuration Options
                                      </h6>
                                      <div className="space-y-2">
                                        {Object.entries(product.options).map(([optionGroup, optionValues]: [string, any]) => (
                                          <div key={optionGroup} className="text-xs">
                                            <span className="font-medium text-foreground-700">{optionGroup}:</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {optionValues.map((opt: any, idx: number) => (
                                                <Chip
                                                  key={idx}
                                                  size="sm"
                                                  variant="flat"
                                                  color="default"
                                                  startContent={opt.imageUrl && <Icon icon="lucide:image" width={10} />}
                                                >
                                                  {typeof opt === "string" ? opt : opt.value}
                                                </Chip>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab
          key="json"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="lucide:code" width={16} />
              JSON Preview
            </div>
          }
        >
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <h4 className="font-semibold">Configuration JSON</h4>
              <div className="flex gap-2">
                <Button size="sm" variant="flat" onPress={copyToClipboard} startContent={<Icon icon="lucide:copy" width={16} />}>
                  Copy
                </Button>
                <Button size="sm" color="primary" onPress={downloadConfig} startContent={<Icon icon="lucide:download" width={16} />}>
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <pre className="w-full px-2 py-1 h-fit font-mono font-normal bg-default/40 text-default-700 rounded-small text-xs overflow-x-auto">
                <code>{exportedData || JSON.stringify(stepperConfig, null, 2)}</code>
              </pre>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>

      {/* Import Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Import Configuration</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Icon icon="lucide:alert-triangle" width={16} className="text-warning-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-warning-800">Warning</p>
                        <p className="text-xs text-warning-600">
                          Importing will replace all current data. Make sure to export your current configuration first if needed.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Textarea
                    label="JSON Data"
                    placeholder="Paste your exported JSON configuration here..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleImport} isDisabled={!importText.trim()}>
                  Import
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
