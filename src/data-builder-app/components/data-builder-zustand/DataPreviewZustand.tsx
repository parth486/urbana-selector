import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Code,
  Tabs,
  Tab,
  Accordion,
  AccordionItem,
  Chip,
  Avatar,
  Divider,
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

export const DataPreviewZustand: React.FC = () => {
  const { productGroups, productRanges, products, relationships, exportData, importData } = useDataBuilderStore();

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [importText, setImportText] = React.useState("");
  const [exportedData, setExportedData] = React.useState<string>("");
  const [previewMode, setPreviewMode] = React.useState<"structure" | "json">("structure");

  // Generate the stepper configuration
  const generateStepperConfig = (): ProductDataStructure => {
    const steps = productGroups.map((group, index) => {
      const groupRanges = relationships.groupToRanges[group.id] || [];
      const categories = groupRanges.map((rangeId) => {
        const range = productRanges.find((r) => r.id === rangeId);
        return range?.name || "Unknown Range";
      });

      // Build products for this step's ranges
      const stepProducts: Record<string, any> = {};
      groupRanges.forEach((rangeId) => {
        const range = productRanges.find((r) => r.id === rangeId);
        if (range) {
          const rangeProducts = relationships.rangeToProducts[rangeId] || [];
          stepProducts[range.name] = rangeProducts.map((productId) => {
            const product = products.find((p) => p.id === productId);
            return {
              id: product?.id || productId,
              code: product?.code || "",
              name: product?.name || "Unknown Product",
              overview: product?.overview || "",
              description: product?.description || "",
              specifications: product?.specifications || [],
              imageGallery: product?.imageGallery || [],
              files: product?.files || {},
            };
          });
        }
      });

      return {
        step: index + 1,
        title: group.name,
        categories: categories.length > 0 ? categories : undefined,
        products: stepProducts,
      };
    });

    return {
      stepperForm: {
        steps,
      },
    };
  };

  const handleExport = () => {
    const data = exportData();
    setExportedData(JSON.stringify(data, null, 2));
    setPreviewMode("json");
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importText);
      importData(data);
      setImportText("");
      onClose();
    } catch (error) {
      alert("Invalid JSON format. Please check your data.");
    }
  };

  const downloadConfig = () => {
    const config = generateStepperConfig();
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = "stepper-config.json";
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const copyToClipboard = () => {
    const config = generateStepperConfig();
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    // You could add a toast notification here
  };

  const stepperConfig = generateStepperConfig();

  // Calculate all products across all steps
  const allProductsByCategory: Record<string, any[]> = {};
  stepperConfig.stepperForm.steps.forEach((step) => {
    if (step.products) {
      Object.entries(step.products).forEach(([categoryName, products]) => {
        if (!allProductsByCategory[categoryName]) {
          allProductsByCategory[categoryName] = [];
        }
        allProductsByCategory[categoryName].push(...(products as any[]));
      });
    }
  });

  const stats = {
    totalSteps: stepperConfig.stepperForm.steps.length,
    totalCategories: Object.keys(allProductsByCategory).length,
    totalProducts: Object.values(allProductsByCategory).reduce((sum, products) => sum + products.length, 0),
    hasIssues: stepperConfig.stepperForm.steps.some((step) => !step.categories || step.categories.length === 0),
  };

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.totalSteps}</div>
              <div className="text-sm text-foreground-500">Stepper Steps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary-600">{stats.totalCategories}</div>
              <div className="text-sm text-foreground-500">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600">{stats.totalProducts}</div>
              <div className="text-sm text-foreground-500">Products</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${stats.hasIssues ? "text-warning-600" : "text-success-600"}`}>
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
                          {step.categories && step.categories.length > 0 ? (
                            <div className="flex gap-1 mt-1">
                              {step.categories.map((category, index) => (
                                <Chip key={index} size="sm" variant="flat" color="secondary">
                                  {category}
                                </Chip>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-warning-600 mt-1">
                              <Icon icon="lucide:alert-triangle" width={14} className="inline mr-1" />
                              No categories linked
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Products by Category */}
            <Card>
              <CardHeader>
                <h4 className="font-semibold flex items-center gap-2">
                  <Icon icon="lucide:package" width={16} />
                  Products by Category
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
                    {Object.entries(allProductsByCategory).map(([categoryName, categoryProducts]) => (
                      <AccordionItem
                        key={categoryName}
                        title={
                          <div className="flex items-center gap-3">
                            <Avatar
                              icon={<Icon icon="lucide:grid-3x3" width={16} />}
                              className="w-6 h-6 bg-secondary-100 text-secondary-600"
                            />
                            <span className="font-medium">{categoryName}</span>
                            <Chip size="sm" variant="flat" color="secondary">
                              {categoryProducts.length} product{categoryProducts.length !== 1 ? "s" : ""}
                            </Chip>
                          </div>
                        }
                      >
                        <div className="space-y-3 pl-4">
                          {categoryProducts.map((product: any) => (
                            <div key={product.id} className="border-l-2 border-success-200 pl-4">
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
                                  </div>
                                  <p className="text-sm text-foreground-600 mb-2">{product.overview}</p>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    <div>
                                      <span className="font-medium text-foreground-700">Specifications:</span>
                                      <span className="text-foreground-500 ml-1">{product.specifications.length}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-foreground-700">Images:</span>
                                      <span className="text-foreground-500 ml-1">{product.imageGallery.length}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-foreground-700">Files:</span>
                                      <span className="text-foreground-500 ml-1">{Object.keys(product.files).length}</span>
                                    </div>
                                  </div>
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
              <Code className="w-full max-h-96 overflow-auto text-xs">{exportedData || JSON.stringify(stepperConfig, null, 2)}</Code>
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
