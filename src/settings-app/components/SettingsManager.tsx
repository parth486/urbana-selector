import React, { useState, useEffect, useCallback } from "react";
import { Card, CardBody, CardHeader, Button, Input, Select, SelectItem, Chip, Divider, Tabs, Tab, Spinner, Code } from "@heroui/react";
import { Icon } from "@iconify/react";
import { DigitalOceanSettings } from "./DigitalOceanSettings";
import { GeneralSettings } from "./GeneralSettings";

interface SettingsData {
  digitalOcean: {
    bucket_name: string;
    region: string;
    access_key: string;
    secret_key: string;
    configured: boolean;
  };
  general: {
    email_notifications: boolean;
    auto_save: boolean;
    debug_mode: boolean;
  };
}

export const SettingsManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    digitalOcean: {
      bucket_name: "",
      region: "nyc3",
      access_key: "",
      secret_key: "",
      configured: false,
    },
    general: {
      email_notifications: true,
      auto_save: true,
      debug_mode: false,
    },
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load Digital Ocean config
      const response = await fetch("/wp-json/urbana/v1/digital-ocean/config", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
        },
      });

      if (response.ok) {
        const doConfig = await response.json();
        setSettings((prev) => ({
          ...prev,
          digitalOcean: {
            ...prev.digitalOcean,
            ...doConfig,
          },
        }));
      }

      // Load general settings from WordPress options if available
      // For now, we'll use defaults
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSettingsChange = useCallback((section: keyof SettingsData, updates: Partial<SettingsData[keyof SettingsData]>) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates,
      },
    }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Save Digital Ocean settings
      const doResponse = await fetch("/wp-json/urbana/v1/digital-ocean/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
        },
        body: JSON.stringify(settings.digitalOcean),
      });

      if (!doResponse.ok) {
        throw new Error("Failed to save Digital Ocean settings");
      }

      // Save general settings (implement endpoint if needed)
      // TODO: Implement general settings save endpoint

      setHasChanges(false);
      setLastSaved(new Date());

      // Show success notification
      if ((window as any).wp?.data?.dispatch("core/notices")) {
        (window as any).wp.data.dispatch("core/notices").createSuccessNotice("Settings saved successfully!");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      // Show error notification
      if ((window as any).wp?.data?.dispatch("core/notices")) {
        (window as any).wp.data.dispatch("core/notices").createErrorNotice("Failed to save settings. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <Spinner size="lg" color="primary" />
          <p className="text-foreground-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-foreground-500">Configure your Urbana Selector plugin settings</p>
        </div>

        <div className="flex items-center gap-4">
          {lastSaved && (
            <div className="text-sm text-foreground-500 text-right">
              <div className="text-xs">Last saved:</div>
              <div className="font-medium">{lastSaved.toLocaleString()}</div>
            </div>
          )}

          <Button
            color={hasChanges ? "primary" : "success"}
            variant={hasChanges ? "solid" : "flat"}
            onPress={handleSave}
            isLoading={isSaving}
            isDisabled={isSaving || !hasChanges}
            startContent={isSaving ? undefined : <Icon icon="lucide:save" width={18} />}
            size="lg"
          >
            {isSaving ? "Saving..." : hasChanges ? "Save Changes" : "Saved"}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Card className="overflow-visible">
        <CardBody className="p-0">
          <Tabs
            aria-label="Settings"
            variant="underlined"
            classNames={{
              tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
              cursor: "w-full bg-primary",
              tab: "max-w-fit px-6 h-12",
              tabContent: "group-data-[selected=true]:text-primary",
            }}
          >
            <Tab
              key="digital-ocean"
              title={
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:cloud" width={18} />
                  <span>Digital Ocean</span>
                  <Chip size="sm" variant="flat" color={settings.digitalOcean.configured ? "success" : "warning"}>
                    {settings.digitalOcean.configured ? "Configured" : "Setup Required"}
                  </Chip>
                </div>
              }
            >
              <div className="p-6">
                <DigitalOceanSettings
                  settings={settings.digitalOcean}
                  onChange={(updates) => handleSettingsChange("digitalOcean", updates)}
                />
              </div>
            </Tab>

            <Tab
              key="general"
              title={
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:settings" width={18} />
                  <span>General</span>
                </div>
              }
            >
              <div className="p-6">
                <GeneralSettings settings={settings.general} onChange={(updates) => handleSettingsChange("general", updates)} />
              </div>
            </Tab>

            <Tab
              key="about"
              title={
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:info" width={18} />
                  <span>About</span>
                </div>
              }
            >
              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Urbana Selector Plugin</h3>
                    <p className="text-foreground-600 mb-4">
                      A comprehensive product configuration system for Urbana products with advanced data management capabilities.
                    </p>
                  </div>

                  <Divider />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border">
                      <CardHeader>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Icon icon="lucide:package" width={16} />
                          Features
                        </h4>
                      </CardHeader>
                      <CardBody>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2">
                            <Icon icon="lucide:check" width={12} className="text-success" />
                            Product data management
                          </li>
                          <li className="flex items-center gap-2">
                            <Icon icon="lucide:check" width={12} className="text-success" />
                            Digital Ocean Spaces integration
                          </li>
                          <li className="flex items-center gap-2">
                            <Icon icon="lucide:check" width={12} className="text-success" />
                            Asset folder generation
                          </li>
                          <li className="flex items-center gap-2">
                            <Icon icon="lucide:check" width={12} className="text-success" />
                            Customer order management
                          </li>
                        </ul>
                      </CardBody>
                    </Card>

                    <Card className="border">
                      <CardHeader>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Icon icon="lucide:code" width={16} />
                          Tech Stack
                        </h4>
                      </CardHeader>
                      <CardBody>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2">
                            <Icon icon="lucide:check" width={12} className="text-success" />
                            React 18+ with TypeScript
                          </li>
                          <li className="flex items-center gap-2">
                            <Icon icon="lucide:check" width={12} className="text-success" />
                            HeroUI component library
                          </li>
                          <li className="flex items-center gap-2">
                            <Icon icon="lucide:check" width={12} className="text-success" />
                            PHP 8.1+ backend
                          </li>
                          <li className="flex items-center gap-2">
                            <Icon icon="lucide:check" width={12} className="text-success" />
                            WordPress REST API
                          </li>
                        </ul>
                      </CardBody>
                    </Card>
                  </div>
                </div>
              </div>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
};
