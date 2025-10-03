import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  ScrollShadow,
  Chip,
  Progress,
  Input,
  Tabs,
  Tab,
  Code,
} from "@heroui/react";
import { Icon } from "@iconify/react";

interface DigitalOceanObject {
  key: string;
  size: number;
  last_modified: string;
  url: string;
}

interface StructuredData {
  [category: string]: {
    [range: string]: {
      [productCode: string]: {
        images: FileInfo[];
        downloads: FileInfo[];
      };
    };
  };
}

interface FileInfo {
  filename: string;
  url: string;
  size: number;
  modified: string;
}

interface DigitalOceanConfig {
  bucket_name: string;
  region: string;
  endpoint: string;
  configured: boolean;
}

interface DigitalOceanResult {
  success: boolean;
  message: string;
  total_folders: number;
  total_objects: number;
  raw_folders: string[];
  raw_objects: DigitalOceanObject[];
  structured_data: StructuredData;
  debug_info: {
    prefix: string;
    configuration: DigitalOceanConfig;
    categories: string[];
  };
}

interface FetchFromDigitalOceanModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FetchFromDigitalOceanModal: React.FC<FetchFromDigitalOceanModalProps> = ({ isOpen, onOpenChange }) => {
  const [config, setConfig] = useState<DigitalOceanConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [fetchResult, setFetchResult] = useState<DigitalOceanResult | null>(null);
  const [prefix, setPrefix] = useState("");

  // Stats computed from fetch result
  const stats = useMemo(() => {
    if (!fetchResult) {
      return { categories: 0, ranges: 0, products: 0, totalFiles: 0, totalFolders: 0 };
    }

    const { structured_data, total_folders, total_objects } = fetchResult;
    const categories = Object.keys(structured_data).length;
    let ranges = 0;
    let products = 0;
    let totalFiles = 0;

    Object.values(structured_data).forEach((categoryData) => {
      ranges += Object.keys(categoryData).length;
      Object.values(categoryData).forEach((rangeData) => {
        products += Object.keys(rangeData).length;
        Object.values(rangeData).forEach((productData) => {
          totalFiles += productData.images.length + productData.downloads.length;
        });
      });
    });

    return {
      categories,
      ranges,
      products,
      totalFiles,
      totalFolders: total_folders || 0,
    };
  }, [fetchResult]);

  // Load config when modal opens
  useEffect(() => {
    if (isOpen) {
      loadConfig();
      setFetchResult(null);
      setConnectionStatus(null);
    }
  }, [isOpen]);

  const loadConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    try {
      const response = await fetch("/wp-json/urbana/v1/digital-ocean/config", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
        },
      });

      if (response.ok) {
        const configData = await response.json();
        setConfig(configData);
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setConnectionStatus(null);

    try {
      const response = await fetch("/wp-json/urbana/v1/digital-ocean/test-connection", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
        },
      });

      if (response.ok) {
        const result = await response.json();
        setConnectionStatus(result);
      } else {
        setConnectionStatus({
          success: false,
          message: "Connection test failed",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setConnectionStatus({
        success: false,
        message: errorMessage,
      });
    } finally {
      setIsTesting(false);
    }
  }, []);

  const handleFetchAssets = useCallback(async () => {
    setIsFetching(true);
    setFetchResult(null);

    try {
      const response = await fetch("/wp-json/urbana/v1/digital-ocean/fetch-assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
        },
        body: JSON.stringify({ prefix }),
      });

      if (response.ok) {
        const result = await response.json();
        setFetchResult(result);
      } else {
        throw new Error(`Failed to fetch assets: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setFetchResult({
        success: false,
        message: errorMessage,
        total_folders: 0,
        total_objects: 0,
        raw_folders: [],
        raw_objects: [],
        structured_data: {},
        debug_info: {
          prefix: prefix || "",
          configuration: config || {
            bucket_name: "",
            region: "",
            endpoint: "",
            configured: false,
          },
          categories: [],
        },
      });
    } finally {
      setIsFetching(false);
    }
  }, [prefix, config]);

  const handleClose = useCallback(() => {
    setFetchResult(null);
    setConnectionStatus(null);
    setIsFetching(false);
    setIsTesting(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const renderStructuredData = (data: StructuredData) => {
    return Object.entries(data).map(([category, categoryData]) => (
      <div key={category} className="mb-4">
        <h4 className="font-semibold text-lg text-primary mb-2 flex items-center gap-2">
          <Icon icon="lucide:folder" width={16} />
          {category}
        </h4>
        {Object.entries(categoryData).map(([range, rangeData]) => (
          <div key={range} className="ml-4 mb-3">
            <h5 className="font-medium text-secondary mb-1 flex items-center gap-2">
              <Icon icon="lucide:folder-open" width={14} />
              {range}
            </h5>
            {Object.entries(rangeData).map(([productCode, productData]) => (
              <div key={productCode} className="ml-4 mb-2">
                <h6 className="font-medium text-success mb-1 flex items-center gap-2">
                  <Icon icon="lucide:package" width={12} />
                  {productCode}
                </h6>
                <div className="ml-4 text-sm space-y-1">
                  {productData.images.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:image" width={12} className="text-primary" />
                      <span>Images: {productData.images.length}</span>
                      <Chip size="sm" variant="flat" color="primary">
                        {productData.images.length}
                      </Chip>
                    </div>
                  )}
                  {productData.downloads.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:file" width={12} className="text-secondary" />
                      <span>Downloads: {productData.downloads.length}</span>
                      <Chip size="sm" variant="flat" color="secondary">
                        {productData.downloads.length}
                      </Chip>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    ));
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="5xl"
      scrollBehavior="inside"
      className="urbana-modal"
      isDismissable={!isFetching && !isTesting}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Icon icon="lucide:cloud-download" width={20} />
                Fetch from Digital Ocean Spaces
              </div>
              <p className="text-sm text-foreground-500 font-normal">Browse and analyze assets stored in your Digital Ocean Spaces</p>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-6">
                {/* Configuration Status */}
                <Card className={config?.configured ? "border-success" : "border-warning"}>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon
                          icon={config?.configured ? "lucide:check-circle" : "lucide:alert-circle"}
                          width={20}
                          className={config?.configured ? "text-success" : "text-warning"}
                        />
                        <div>
                          <h4 className="font-semibold">Configuration Status</h4>
                          <p className="text-sm text-foreground-500">
                            {config?.configured ? "Digital Ocean Spaces is configured" : "Configuration required"}
                          </p>
                        </div>
                      </div>
                      <Button
                        color="primary"
                        variant="flat"
                        size="sm"
                        onPress={handleTestConnection}
                        isLoading={isTesting}
                        isDisabled={!config?.configured || isTesting || isFetching}
                        startContent={!isTesting ? <Icon icon="lucide:wifi" width={16} /> : undefined}
                      >
                        {isTesting ? "Testing..." : "Test Connection"}
                      </Button>
                    </div>

                    {config && (
                      <div className="mt-3 text-sm text-foreground-600">
                        <div>Bucket: {config.bucket_name || "Not set"}</div>
                        <div>Region: {config.region || "Not set"}</div>
                        <div>Endpoint: {config.endpoint || "Not set"}</div>
                      </div>
                    )}

                    {connectionStatus && (
                      <div className="mt-3">
                        <Chip
                          size="sm"
                          variant="flat"
                          color={connectionStatus.success ? "success" : "danger"}
                          startContent={<Icon icon={connectionStatus.success ? "lucide:check" : "lucide:x"} width={12} />}
                        >
                          {connectionStatus.message}
                        </Chip>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Fetch Options */}
                <Card>
                  <CardBody>
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Icon icon="lucide:settings" width={16} />
                        Fetch Options
                      </h4>

                      <Input
                        label="Prefix Filter (Optional)"
                        placeholder="e.g., shelter/ or shelter/peninsula/"
                        value={prefix}
                        onValueChange={setPrefix}
                        description="Filter objects by prefix to limit the search scope"
                        startContent={<Icon icon="lucide:filter" width={16} />}
                        isDisabled={isFetching}
                        classNames={{ input: "urbana-input" }}
                      />
                    </div>
                  </CardBody>
                </Card>

                {/* Fetch Progress */}
                {isFetching && (
                  <Card className="border-primary">
                    <CardBody>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Icon icon="lucide:loader" width={16} className="animate-spin text-primary" />
                          <span className="font-semibold">Fetching Assets...</span>
                        </div>
                        <Progress isIndeterminate color="primary" size="sm" className="w-full" />
                        <p className="text-sm text-foreground-500">Please wait while we fetch assets from Digital Ocean Spaces...</p>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Results */}
                {fetchResult && (
                  <Card className={fetchResult.success ? "border-success" : "border-danger"}>
                    <CardBody>
                      <Tabs aria-label="Fetch Results">
                        <Tab
                          key="summary"
                          title={
                            <div className="flex items-center gap-2">
                              <Icon icon="lucide:bar-chart" width={16} />
                              Summary
                            </div>
                          }
                        >
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Icon
                                icon={fetchResult.success ? "lucide:check-circle" : "lucide:x-circle"}
                                width={16}
                                className={fetchResult.success ? "text-success" : "text-danger"}
                              />
                              <span className="font-semibold">{fetchResult.success ? "Fetch Successful!" : "Fetch Failed"}</span>
                            </div>

                            <p className="text-sm">{fetchResult.message}</p>

                            {fetchResult.success && (
                              <div className="grid grid-cols-5 gap-4 text-center mt-4">
                                <div>
                                  <div className="text-2xl font-bold text-primary">{stats.categories}</div>
                                  <div className="text-sm text-foreground-500">Categories</div>
                                </div>
                                <div>
                                  <div className="text-2xl font-bold text-secondary">{stats.ranges}</div>
                                  <div className="text-sm text-foreground-500">Ranges</div>
                                </div>
                                <div>
                                  <div className="text-2xl font-bold text-success">{stats.products}</div>
                                  <div className="text-sm text-foreground-500">Products</div>
                                </div>
                                <div>
                                  <div className="text-2xl font-bold text-warning">{stats.totalFiles}</div>
                                  <div className="text-sm text-foreground-500">Files</div>
                                </div>
                                <div>
                                  <div className="text-2xl font-bold text-danger">{stats.totalFolders}</div>
                                  <div className="text-sm text-foreground-500">Folders</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </Tab>

                        <Tab
                          key="structure"
                          title={
                            <div className="flex items-center gap-2">
                              <Icon icon="lucide:folder-tree" width={16} />
                              Structure
                            </div>
                          }
                        >
                          <ScrollShadow className="max-h-96">
                            <div className="text-sm">
                              {Object.keys(fetchResult.structured_data).length > 0 ? (
                                renderStructuredData(fetchResult.structured_data)
                              ) : (
                                <div className="text-center text-foreground-500 py-8">
                                  <Icon icon="lucide:folder-x" width={48} className="mx-auto mb-2 opacity-50" />
                                  <p>No structured data found</p>
                                </div>
                              )}
                            </div>
                          </ScrollShadow>
                        </Tab>

                        <Tab
                          key="debug"
                          title={
                            <div className="flex items-center gap-2">
                              <Icon icon="lucide:bug" width={16} />
                              Debug
                            </div>
                          }
                        >
                          <ScrollShadow className="max-h-96">
                            <div className="space-y-4 text-sm">
                              <div>
                                <h5 className="font-medium mb-2">Configuration</h5>
                                <Code className="text-xs">{JSON.stringify(fetchResult.debug_info.configuration, null, 2)}</Code>
                              </div>

                              <div>
                                <h5 className="font-medium mb-2">Folders Found</h5>
                                <ScrollShadow className="max-h-32">
                                  <Code className="text-xs">
                                    {fetchResult.raw_folders.length > 0 ? fetchResult.raw_folders.join("\n") : "No folders found"}
                                  </Code>
                                </ScrollShadow>
                              </div>

                              <div>
                                <h5 className="font-medium mb-2">Fetch Summary</h5>
                                <div className="space-y-1">
                                  <div>Prefix: {fetchResult.debug_info.prefix || "(none)"}</div>
                                  <div>Total Folders: {fetchResult.total_folders}</div>
                                  <div>Total Objects: {fetchResult.total_objects}</div>
                                  <div>Categories Found: {fetchResult.debug_info.categories.join(", ") || "(none)"}</div>
                                </div>
                              </div>

                              {fetchResult.raw_objects.length > 0 && (
                                <div>
                                  <h5 className="font-medium mb-2">Sample Objects</h5>
                                  <ScrollShadow className="max-h-32">
                                    <Code className="text-xs">{JSON.stringify(fetchResult.raw_objects.slice(0, 5), null, 2)}</Code>
                                  </ScrollShadow>
                                </div>
                              )}
                            </div>
                          </ScrollShadow>
                        </Tab>
                      </Tabs>
                    </CardBody>
                  </Card>
                )}
              </div>
            </ModalBody>

            <ModalFooter>
              <Button variant="light" onPress={handleClose} isDisabled={isFetching || isTesting}>
                {fetchResult ? "Close" : "Cancel"}
              </Button>

              {!fetchResult && (
                <Button
                  color="primary"
                  onPress={handleFetchAssets}
                  isLoading={isFetching}
                  isDisabled={!config?.configured || isFetching || isTesting}
                  startContent={!isFetching ? <Icon icon="lucide:cloud-download" width={16} /> : undefined}
                >
                  {isFetching ? "Fetching..." : "Fetch Assets"}
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
