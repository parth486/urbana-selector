import React from "react";
import { Button, Spinner, Alert } from "@heroui/react";
import { Icon } from "@iconify/react";
import { DataBuilder } from "./components/data-builder/DataBuilder";
import { useDataBuilderStore } from "./stores/useDataBuilderStore";

export default function App() {
  const { productGroups, isDirty, isSaving, isLoading, error, lastSaved, saveData, loadData, clearError, initializeFromWindowData } =
    useDataBuilderStore();

  // Initialize from window data on first load - REMOVE the default data override
  React.useEffect(() => {
    const windowData = (window as any).urbanaAdmin;

    if (windowData && productGroups.length === 0) {
      console.log("App initializing from window data");
      initializeFromWindowData();
    }
  }, [initializeFromWindowData, productGroups.length]);

  const handleSave = async () => {
    try {
      clearError();
      await saveData();
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const handleLoad = async () => {
    try {
      clearError();
      await loadData();
    } catch (error) {
      console.error("Load failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-foreground-600">Loading product data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="py-6 px-4 sm:px-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Data Builder</h1>
            <p className="text-foreground-500 mt-2">Create and manage product configuration data</p>
          </div>

          <div className="flex items-center gap-3">
            {lastSaved && (
              <div className="text-sm text-foreground-500 text-right">
                <div>Last saved:</div>
                <div className="font-medium">{new Date(lastSaved).toLocaleString()}</div>
              </div>
            )}

            <Button
              variant="flat"
              color="primary"
              startContent={<Icon icon="lucide:refresh-cw" width={18} />}
              onPress={handleLoad}
              isLoading={isLoading}
            >
              Refresh Data
            </Button>

            {isDirty && (
              <Button
                color="primary"
                startContent={<Icon icon="lucide:save" width={18} />}
                onPress={handleSave}
                isLoading={isSaving}
                isDisabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert
            color="danger"
            variant="flat"
            className="mb-6"
            title="Error"
            description={error}
            endContent={
              <Button variant="light" color="danger" size="sm" onPress={clearError}>
                Dismiss
              </Button>
            }
          />
        )}

        {/* Dirty State Indicator */}
        {isDirty && !error && (
          <Alert
            color="warning"
            variant="flat"
            className="mb-6"
            title="Unsaved Changes"
            description="You have unsaved changes. Don't forget to save your work!"
          />
        )}

        {/* Main Content */}
        <DataBuilder />
      </div>
    </div>
  );
}
