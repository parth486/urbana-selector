import React, { useState, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Divider,
  Spinner,
  Code,
  Textarea,
  useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { FetchFromDigitalOceanModal } from "./FetchFromDigitalOceanModal";

interface ReverseSyncSettings {
  enabled: boolean;
  auto_create_group_folders: boolean;
  auto_create_range_folders: boolean;
  auto_create_product_folders: boolean;
  base_path: string;
  preserve_folder_case?: boolean;
}

interface DigitalOceanSettingsData {
  bucket_name: string;
  region: string;
  access_key: string;
  secret_key: string;
  cdn_endpoint?: string;
  configured: boolean;
  reverse_sync?: ReverseSyncSettings;
}

interface DigitalOceanSettingsProps {
  settings: DigitalOceanSettingsData;
  onChange: (updates: Partial<DigitalOceanSettingsData>) => void;
}

const REGIONS = [
  { key: "nyc1", label: "New York 1" },
  { key: "nyc2", label: "New York 2" },
  { key: "nyc3", label: "New York 3" },
  { key: "ams3", label: "Amsterdam 3" },
  { key: "sfo2", label: "San Francisco 2" },
  { key: "sfo3", label: "San Francisco 3" },
  { key: "sgp1", label: "Singapore 1" },
  { key: "lon1", label: "London 1" },
  { key: "fra1", label: "Frankfurt 1" },
  { key: "tor1", label: "Toronto 1" },
  { key: "blr1", label: "Bangalore 1" },
  { key: "syd1", label: "Sydney 1" },
  { key: "atl1", label: "Atlanta 1" },
];

export const DigitalOceanSettings: React.FC<DigitalOceanSettingsProps> = ({ settings, onChange }) => {
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [syncTestResult, setSyncTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const { isOpen: isFetchModalOpen, onOpen: onFetchModalOpen, onOpenChange: onFetchModalOpenChange } = useDisclosure();

  const handleInputChange = useCallback(
    (field: keyof DigitalOceanSettingsData, value: string) => {
      onChange({ [field]: value });
    },
    [onChange]
  );

  const handleReverseSyncChange = useCallback(
    (field: keyof ReverseSyncSettings, value: string | boolean) => {
      const currentReversSync = settings.reverse_sync || {
        enabled: false,
        auto_create_group_folders: true,
        auto_create_range_folders: true,
        auto_create_product_folders: true,
        base_path: ""
      };
      
      onChange({ 
        reverse_sync: {
          ...currentReversSync,
          [field]: value
        }
      });
    },
    [onChange, settings.reverse_sync]
  );

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
          message: "Failed to test connection",
        });
      }
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: "Connection test failed",
      });
    } finally {
      setIsTesting(false);
    }
  }, []);

  const handleTestSync = useCallback(async () => {
    setIsTestingSync(true);
    setSyncTestResult(null);

    try {
      // Test creating a sample group folder using a test group ID
      const response = await fetch("/wp-json/urbana/v1/digital-ocean/create-group-folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
        },
        body: JSON.stringify({
          group_ids: ["test-sync-folder"],
          base_path: settings.reverse_sync?.base_path || ""
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSyncTestResult({
          success: result.success,
          message: result.success ? "Test sync completed successfully!" : result.message,
          details: result
        });
      } else {
        const error = await response.json();
        setSyncTestResult({
          success: false,
          message: error.message || "Test sync failed",
          details: error
        });
      }
    } catch (error) {
      setSyncTestResult({
        success: false,
        message: "Failed to test sync. Please check your configuration and connection.",
      });
    } finally {
      setIsTestingSync(false);
    }
  }, [settings.reverse_sync?.base_path]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">Digital Ocean Spaces</h2>
        <p className="text-foreground-500">Configure your Digital Ocean Spaces for asset storage and management.</p>
      </div>

      {/* Connection Status */}
      {connectionStatus && (
        <Card className={`border ${connectionStatus.success ? "border-success" : "border-danger"}`}>
          <CardBody>
            <div className="flex items-center gap-3">
              <Icon
                icon={connectionStatus.success ? "lucide:check-circle" : "lucide:x-circle"}
                width={20}
                className={connectionStatus.success ? "text-success" : "text-danger"}
              />
              <div>
                <p className="font-medium">{connectionStatus.success ? "Connection Successful" : "Connection Failed"}</p>
                <p className="text-sm text-foreground-500">{connectionStatus.message}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-fit">
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <Icon icon="lucide:settings" width={16} />
              Configuration
            </h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Bucket Name"
              placeholder="your-bucket-name"
              value={settings.bucket_name}
              onValueChange={(value) => handleInputChange("bucket_name", value)}
              startContent={<Icon icon="lucide:bucket" width={16} />}
              isRequired
              classNames={{ input: "urbana-input" }}
            />

            <Select
              label="Region"
              placeholder="Select a region"
              selectedKeys={settings.region ? [settings.region] : []}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0] as string;
                if (selectedKey) {
                  handleInputChange("region", selectedKey);
                }
              }}
            >
              {REGIONS.map((region) => (
                <SelectItem key={region.key}>{region.label}</SelectItem>
              ))}
            </Select>

            <Input
              label="Access Key"
              placeholder="Your access key"
              value={settings.access_key}
              onValueChange={(value) => handleInputChange("access_key", value)}
              startContent={<Icon icon="lucide:key" width={16} />}
              isRequired
              classNames={{ input: "urbana-input" }}
            />

            <Input
              label="Secret Key"
              placeholder="Your secret key"
              type="password"
              value={settings.secret_key}
              onValueChange={(value) => handleInputChange("secret_key", value)}
              startContent={<Icon icon="lucide:eye-off" width={16} />}
              isRequired
              classNames={{ input: "urbana-input" }}
            />

            <Input
              label="CDN Endpoint (Optional)"
              placeholder="https://your-cdn-endpoint.com"
              value={settings.cdn_endpoint || ""}
              onValueChange={(value) => handleInputChange("cdn_endpoint", value)}
              startContent={<Icon icon="lucide:globe" width={16} />}
              description="Use your CDN URL if configured, or leave empty to use direct bucket URLs"
              classNames={{ input: "urbana-input" }}
            />

            <Divider />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Configuration Status</p>
                <p className="text-sm text-foreground-500">{settings.configured ? "Ready to use" : "Configuration incomplete"}</p>
              </div>
              <Chip
                size="sm"
                variant="flat"
                color={settings.configured ? "success" : "warning"}
                startContent={<Icon icon={settings.configured ? "lucide:check" : "lucide:alert-circle"} width={12} />}
              >
                {settings.configured ? "Configured" : "Setup Required"}
              </Chip>
            </div>

            <Button
              color="primary"
              variant="flat"
              onPress={handleTestConnection}
              isLoading={isTesting}
              isDisabled={!settings.bucket_name || !settings.access_key || !settings.secret_key}
              startContent={!isTesting ? <Icon icon="lucide:wifi" width={16} /> : undefined}
              className="w-full"
            >
              {isTesting ? "Testing..." : "Test Connection"}
            </Button>

            <Button
              color="secondary"
              variant="flat"
              onPress={onFetchModalOpen}
              isDisabled={!settings.configured}
              startContent={<Icon icon="lucide:cloud-download" width={16} />}
              className="w-full"
            >
              Browse Assets
            </Button>
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <Icon icon="lucide:info" width={16} />
              Setup Instructions
            </h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium">Create a Space</p>
                  <p className="text-sm text-foreground-500">Go to your Digital Ocean dashboard and create a new Space</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium">Generate API Keys</p>
                  <p className="text-sm text-foreground-500">Create API keys with read/write permissions for Spaces</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium">Configure Settings</p>
                  <p className="text-sm text-foreground-500">Enter your bucket name, region, and API credentials above</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-success text-white text-xs flex items-center justify-center font-bold mt-0.5">
                  <Icon icon="lucide:check" width={12} />
                </div>
                <div>
                  <p className="font-medium">Test Connection</p>
                  <p className="text-sm text-foreground-500">Use the test button to verify your configuration</p>
                </div>
              </div>
            </div>

            <Divider />

            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Icon icon="lucide:alert-triangle" width={16} className="text-warning-600 mt-0.5" />
                <div>
                  <p className="font-medium text-warning-800">Security Note</p>
                  <p className="text-sm text-warning-700">
                    API keys are stored securely in your WordPress database. Never share these credentials.
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Fetch from Digital Ocean Modal */}
      <FetchFromDigitalOceanModal isOpen={isFetchModalOpen} onOpenChange={onFetchModalOpenChange} />

      {/* Sync Test Result */}
      {syncTestResult && (
        <Card className={`border ${syncTestResult.success ? "border-success" : "border-danger"}`}>
          <CardBody>
            <div className="flex items-center gap-3">
              <Icon
                icon={syncTestResult.success ? "lucide:check-circle" : "lucide:x-circle"}
                width={20}
                className={syncTestResult.success ? "text-success" : "text-danger"}
              />
              <div>
                <p className="font-medium">{syncTestResult.success ? "Sync Test Successful" : "Sync Test Failed"}</p>
                <p className="text-sm text-foreground-500">{syncTestResult.message}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Reverse Sync Settings */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <h3 className="font-semibold flex items-center gap-2">
              <Icon icon="lucide:refresh-cw" width={16} />
              Reverse Sync Settings
            </h3>
            <Chip
              size="sm"
              variant="flat"
              color={settings.reverse_sync?.enabled ? "success" : "default"}
              startContent={<Icon icon={settings.reverse_sync?.enabled ? "lucide:check" : "lucide:x"} width={12} />}
            >
              {settings.reverse_sync?.enabled ? "Enabled" : "Disabled"}
            </Chip>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="text-sm text-foreground-600 mb-4">
            <p>Automatically create Digital Ocean folder structure when groups, ranges, or products are added via admin.</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-default/20 rounded-medium">
              <div className="flex items-center gap-3">
                <Icon icon="lucide:toggle-left" width={20} />
                <div>
                  <p className="font-medium">Enable Reverse Sync</p>
                  <p className="text-xs text-foreground-500">Master toggle for automatic folder creation</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.reverse_sync?.enabled || false}
                  onChange={(e) => handleReverseSyncChange("enabled", e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.reverse_sync?.enabled && (
              <>
                <Divider />
                
                <div className="space-y-2">
                  <Input
                    label="Base Path"
                    placeholder="Leave empty for root level"
                    value={settings.reverse_sync?.base_path || ""}
                    onValueChange={(value) => handleReverseSyncChange("base_path", value)}
                    startContent={<Icon icon="lucide:folder" width={16} />}
                    description={
                      settings.reverse_sync?.base_path 
                        ? `Folders will be created under: ${settings.reverse_sync.base_path}/`
                        : "Folders will be created at root level (recommended)"
                    }
                    classNames={{ input: "urbana-input" }}
                  />
                  
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Icon icon="lucide:info" width={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        <p className="font-medium mb-1">Base Path Configuration:</p>
                        <ul className="list-disc list-inside space-y-1 ml-1">
                          <li><strong>Empty (recommended):</strong> Creates <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">Shelter/Peninsula/</code></li>
                          <li><strong>"assets/products":</strong> Creates <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">assets/products/Shelter/Peninsula/</code></li>
                        </ul>
                        <p className="mt-2">
                          If your Digital Ocean already has folders at root level (like "Shelter", "toilet"), leave this empty.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Divider />

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Auto-Create Folders For:</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-small hover:bg-default/10">
                      <div className="flex items-center gap-2">
                        <Icon icon="lucide:layers" width={16} />
                        <span className="text-sm">Product Groups</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.reverse_sync?.auto_create_group_folders !== false}
                          onChange={(e) => handleReverseSyncChange("auto_create_group_folders", e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-small hover:bg-default/10">
                      <div className="flex items-center gap-2">
                        <Icon icon="lucide:grid-3x3" width={16} />
                        <span className="text-sm">Product Ranges</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.reverse_sync?.auto_create_range_folders !== false}
                          onChange={(e) => handleReverseSyncChange("auto_create_range_folders", e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-small hover:bg-default/10">
                      <div className="flex items-center gap-2">
                        <Icon icon="lucide:package" width={16} />
                        <span className="text-sm">Individual Products</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.reverse_sync?.auto_create_product_folders !== false}
                          onChange={(e) => handleReverseSyncChange("auto_create_product_folders", e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-small hover:bg-default/10">
                      <div className="flex items-center gap-2">
                        <Icon icon="lucide:letter-case" width={16} />
                        <span className="text-sm">Preserve folder case</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.reverse_sync?.preserve_folder_case === true}
                          onChange={(e) => handleReverseSyncChange("preserve_folder_case", e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <Divider />

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    color="secondary"
                    startContent={<Icon icon="lucide:eye" width={14} />}
                    onPress={() => {/* TODO: Add sync logs modal */}}
                  >
                    View Sync Logs
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    startContent={!isTestingSync ? <Icon icon="lucide:play" width={14} /> : undefined}
                    onPress={handleTestSync}
                    isLoading={isTestingSync}
                    isDisabled={!settings.configured || !settings.reverse_sync?.enabled}
                  >
                    {isTestingSync ? "Testing..." : "Test Sync"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Usage Information */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold flex items-center gap-2">
            <Icon icon="lucide:folder-tree" width={16} />
            Expected Folder Structure
          </h3>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-foreground-600 mb-4">
            Your Digital Ocean Space should follow this folder structure for optimal integration:
          </p>
          <pre className="px-2 py-1 h-fit font-mono font-normal bg-default/40 text-default-700 rounded-small text-xs overflow-x-auto">
            <code>
              {`your-bucket-name/
├── shelter/
│   └── peninsula/
│       └── k302/
│           ├── images/
│           │   ├── hero.jpg
│           │   └── gallery-1.jpg
│           ├── downloads/
│           │   ├── spec.pdf
│           │   └── install.pdf
│           └── img_conf/
│               ├── Post Material/
│               │   ├── Pine.jpg
│               │   └── Concrete.jpg
│               ├── Seat Material/
│               │   ├── Recycled Plastic.jpg
│               │   └── Thermoplastic.jpg
│               └── Finish/
│                   ├── Galvanized.jpg
│                   └── Powder Coated.jpg
│               
├── seating/
│   └── bench/
│       └── b100/
│           ├── images/
│           └── downloads/
└── ...`}
            </code>
          </pre>
          <div className="mt-4 text-sm text-foreground-500 space-y-2">
            <p>• Category folders (e.g., shelter, seating, bridge)</p>
            <p>• Range folders (e.g., peninsula, bench, decorative)</p>
            <p>• Product code folders (e.g., k302, b100)</p>
            <p>• Asset type folders: images/ and downloads/</p>
          </div>
        </CardBody>
      </Card>

      {/* Renaming Guide */}
      <Card className="border-2 border-warning-200 dark:border-warning-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon icon="lucide:alert-circle" width={20} className="text-warning-600" />
            <h3 className="font-semibold text-warning-800 dark:text-warning-400">
              Important: Renaming Groups, Ranges, or Products
            </h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Renaming in WordPress */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon icon="lucide:edit" width={20} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  Renaming in WordPress Admin (Recommended)
                </h4>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                  <p>When you rename a Product Group, Range, or Product in the admin:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Edit the item and change the name</li>
                    <li>Click Save</li>
                    <li><strong>Popup will ask:</strong> "Do you want to rename the Digital Ocean folder?"</li>
                    <li><strong>Click OK:</strong> Folder and all files are automatically renamed in Digital Ocean ✓</li>
                    <li><strong>Click Cancel:</strong> Only WordPress is updated, folder keeps old name</li>
                  </ol>
                  <div className="bg-blue-100 dark:bg-blue-900 rounded p-2 mt-2">
                    <p className="font-medium">💡 Best Practice:</p>
                    <p>Always rename in WordPress first and let the plugin handle Digital Ocean automatically!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Renaming in Digital Ocean */}
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon icon="lucide:cloud" width={20} className="text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-800 dark:text-orange-300 mb-2">
                  If Folder Name is Changed in Digital Ocean
                </h4>
                <div className="text-sm text-orange-700 dark:text-orange-300 space-y-2">
                  <p className="font-medium">⚠️ Short answer: Nothing happens automatically - WordPress won't know about it.</p>
                  
                  <div className="bg-orange-100 dark:bg-orange-900 rounded p-3 mt-2">
                    <p className="font-medium mb-1">Example Scenario:</p>
                    <p>You rename <code className="bg-orange-200 dark:bg-orange-800 px-1 rounded">Shelter/Peninsula/</code> → <code className="bg-orange-200 dark:bg-orange-800 px-1 rounded">Shelter/Peninsula-V2/</code> in Digital Ocean</p>
                  </div>

                  <div className="space-y-2 mt-2">
                    <p className="font-medium">What happens:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>WordPress database still has: Product Range name = "Peninsula"</li>
                      <li>Digital Ocean now has: Folder = "Shelter/Peninsula-V2/"</li>
                    </ul>
                  </div>

                  <div className="space-y-2 mt-2">
                    <p className="font-medium">Plugin behavior:</p>
                    <ul className="space-y-1 ml-2">
                      <li className="flex items-start gap-2">
                        <Icon icon="lucide:x" width={14} className="text-danger mt-0.5" />
                        <span>"Check Folders" will show "Peninsula" as <strong>"Missing"</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Icon icon="lucide:x" width={14} className="text-danger mt-0.5" />
                        <span>Frontend image URLs will break (looking for old path)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Icon icon="lucide:alert-triangle" width={14} className="text-warning-600 mt-0.5" />
                        <span>If you click "Sync" → Creates a NEW folder "Shelter/Peninsula/"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Icon icon="lucide:alert-triangle" width={14} className="text-warning-600 mt-0.5" />
                        <span><strong>Result:</strong> Two folders (Peninsula and Peninsula-V2)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-orange-100 dark:bg-orange-900 rounded p-3 mt-3">
                    <p className="font-medium mb-2">✓ What You Need to Do:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Rename folder in Digital Ocean</li>
                      <li><strong>Also</strong> rename the Product Range in WordPress admin to match</li>
                      <li>Or manually update image URLs</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* General Tips */}
          <div className="bg-default/40 rounded-lg p-4">
            <h4 className="font-semibold text-foreground-700 mb-2 flex items-center gap-2">
              <Icon icon="lucide:lightbulb" width={16} />
              General Tips
            </h4>
            <ul className="text-sm text-foreground-600 space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Case Sensitivity:</strong> Digital Ocean is case-sensitive. "Shelter" and "shelter" are different folders!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Always Check:</strong> After renaming, use "Check Folders" to verify everything is in sync</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Backup First:</strong> Before bulk renaming, download important files as backup</span>
              </li>
            </ul>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
