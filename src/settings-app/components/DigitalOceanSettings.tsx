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

interface DigitalOceanSettingsData {
  bucket_name: string;
  region: string;
  access_key: string;
  secret_key: string;
  configured: boolean;
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
  const { isOpen: isFetchModalOpen, onOpen: onFetchModalOpen, onOpenChange: onFetchModalOpenChange } = useDisclosure();

  const handleInputChange = useCallback(
    (field: keyof DigitalOceanSettingsData, value: string) => {
      onChange({ [field]: value });
    },
    [onChange]
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
    </div>
  );
};
