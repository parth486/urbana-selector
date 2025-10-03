import React, { useCallback } from "react";
import { Card, CardBody, CardHeader, Switch, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";

interface GeneralSettingsData {
  email_notifications: boolean;
  auto_save: boolean;
  debug_mode: boolean;
}

interface GeneralSettingsProps {
  settings: GeneralSettingsData;
  onChange: (updates: Partial<GeneralSettingsData>) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onChange }) => {
  const handleSwitchChange = useCallback(
    (field: keyof GeneralSettingsData, value: boolean) => {
      onChange({ [field]: value });
    },
    [onChange]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">General Settings</h2>
        <p className="text-foreground-500">Configure general plugin behavior and preferences.</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <Icon icon="lucide:bell" width={16} />
              Notifications
            </h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-foreground-500">Receive email notifications for new form submissions</p>
              </div>
              <Switch
                isSelected={settings.email_notifications}
                onValueChange={(value) => handleSwitchChange("email_notifications", value)}
                color="primary"
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <Icon icon="lucide:save" width={16} />
              Data Management
            </h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto Save</p>
                <p className="text-sm text-foreground-500">Automatically save changes as you work</p>
              </div>
              <Switch isSelected={settings.auto_save} onValueChange={(value) => handleSwitchChange("auto_save", value)} color="primary" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <Icon icon="lucide:bug" width={16} />
              Development
            </h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Debug Mode</p>
                <p className="text-sm text-foreground-500">Enable debug logging and additional developer information</p>
              </div>
              <Switch isSelected={settings.debug_mode} onValueChange={(value) => handleSwitchChange("debug_mode", value)} color="warning" />
            </div>

            {settings.debug_mode && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Icon icon="lucide:alert-triangle" width={16} className="text-warning-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning-800">Debug Mode Active</p>
                    <p className="text-sm text-warning-700">Additional logging is enabled. Disable in production for better performance.</p>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <Icon icon="lucide:info" width={16} />
              Additional Options
            </h3>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-foreground-500 mb-4">More configuration options will be available in future updates.</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon icon="lucide:check" width={12} className="text-success" />
                <span className="text-sm">Database optimization</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon icon="lucide:check" width={12} className="text-success" />
                <span className="text-sm">Performance monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon icon="lucide:check" width={12} className="text-success" />
                <span className="text-sm">Advanced caching options</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold flex items-center gap-2">
            <Icon icon="lucide:server" width={16} />
            System Information
          </h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-foreground-700">WordPress Version</p>
              <p className="text-foreground-500">{(window as any).urbanaAdmin?.wpVersion || "Unknown"}</p>
            </div>
            <div>
              <p className="font-medium text-foreground-700">PHP Version</p>
              <p className="text-foreground-500">{(window as any).urbanaAdmin?.phpVersion || "Unknown"}</p>
            </div>
            <div>
              <p className="font-medium text-foreground-700">Plugin Version</p>
              <p className="text-foreground-500">{(window as any).urbanaAdmin?.pluginVersion || "1.0.0"}</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
