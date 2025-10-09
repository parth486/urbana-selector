import { useEffect, useState, useCallback } from "react";
import { Tabs, Tab, Card, Button, useDisclosure } from "@heroui/react";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/react";
import { ProductGroupsManager } from "./ProductGroupsManager";
import { ProductRangesManager } from "./ProductRangesManager";
import { ProductsManager } from "./ProductsManager";
import { RelationshipsManager } from "./RelationshipsManager";
import { DataPreview } from "./DataPreview";
import { GenerateFoldersModal } from "./GenerateFoldersModal";
import { FetchFromDigitalOceanModal } from "./FetchFromDigitalOceanModal";
import { useDataBuilderStore } from "../../stores/useDataBuilderStore";

export const DataBuilder: React.FC = () => {
  const {
    productGroups,
    productRanges,
    products,
    relationships,
    exportData,
    importData,
    error,
    productData,
    loadData,
    saveData,
    isLoading,
    isSaving,
    isDirty,
    lastSaved,
    initializeFromWindowData,
    clearError,
  } = useDataBuilderStore();

  const [currentStepperId, setCurrentStepperId] = useState<number | null>(null);
  const { isOpen: isFoldersModalOpen, onOpen: onFoldersModalOpen, onOpenChange: onFoldersModalOpenChange } = useDisclosure();
  const { isOpen: isDigitalOceanModalOpen, onOpen: onDigitalOceanModalOpen, onOpenChange: onDigitalOceanModalOpenChange } = useDisclosure();

  // Initialize data from window on component mount
  useEffect(() => {
    const windowData = (window as any).urbanaAdmin;

    if (windowData) {
      // Initialize from window data
      initializeFromWindowData();
      setCurrentStepperId(windowData.stepperId || 1);
    }
  }, [initializeFromWindowData]);

  const handleSaveData = async () => {
    try {
      clearError();
      const stepperId = await saveData();
      if (stepperId) {
        setCurrentStepperId(stepperId);
      }
      addToast({ color: "success", title: "Data saved successfully!" });
    } catch (error) {
      console.error("Failed to save data:", error);

      addToast({ color: "danger", title: "Failed to save data. Please try again." });
    }
  };

  const handleLoadDataBuilder = async (stepperId: number) => {
    try {
      // Redirect to current page with stepper_id parameter
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("stepper_id", stepperId.toString());
      window.location.href = currentUrl.toString();
    } catch (error) {
      console.error("Failed to load data builder:", error);

      addToast({ color: "danger", title: "Failed to load data builder" });
    }
  };

  const handleExportData = () => {
    try {
      const data = exportData();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "product-configurator-data.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();

      addToast({ color: "success", title: "Data exported successfully!" });
    } catch (error) {
      console.error("Export failed:", error);

      addToast({ color: "danger", title: "Failed to export data" });
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        importData(importedData);
        // Reset the file input
        event.target.value = "";

        addToast({ color: "success", title: "Data imported successfully!" });
      } catch (error) {
        console.error("Error parsing imported data:", error);

        addToast({ color: "danger", title: "Invalid data format. Please check your JSON file." });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="urbana-builder-page max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Data Management
              {currentStepperId && <span className="text-sm text-foreground-500 ml-2">(Stepper ID: {currentStepperId})</span>}
            </h2>
            <p className="text-sm text-foreground-500 mt-1">Manage product groups, ranges, products, and their relationships</p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Last Saved Display */}
          {lastSaved && (
            <div className="text-sm text-foreground-500 text-right ml-6">
              <div className="text-xs">Last saved:</div>
              <div className="font-medium">{new Date(lastSaved).toLocaleString()}</div>
            </div>
          )}
          {/* Save Button with loading and dirty state */}
          <Button
            color={isDirty ? "primary" : "success"}
            variant={isDirty ? "solid" : "flat"}
            onPress={handleSaveData}
            isLoading={isSaving}
            isDisabled={isSaving}
            startContent={isSaving ? "" : <Icon icon="lucide:save" width={18} />}
          >
            {isSaving ? "Saving..." : isDirty ? "Save Changes" : "Save Data"}
          </Button>

          <Button color="primary" variant="flat" onPress={handleExportData} startContent={<Icon icon="lucide:download" width={18} />}>
            Export Data
          </Button>

          <label className="cursor-pointer">
            <Button color="primary" variant="flat" as="span" startContent={<Icon icon="lucide:upload" width={18} />}>
              Import Data
            </Button>
            <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
          </label>
          {/* Generate Folders Button */}
          {/* <Button
            color="secondary"
            variant="flat"
            onPress={onFoldersModalOpen}
            startContent={<Icon icon="lucide:folder-plus" width={18} />}
            isDisabled={products.length === 0}
          >
            Generate Folders
          </Button> */}

          {/* Fetch from Digital Ocean Button */}
          <Button
            color="warning"
            variant="flat"
            onPress={onDigitalOceanModalOpen}
            startContent={<Icon icon="lucide:cloud-download" width={18} />}
            isDisabled={products.length === 0}
          >
            Fetch from Digital Ocean
          </Button>
        </div>
      </div>

      {/* Add Stepper ID Selector */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Switch to Stepper ID:</span>
          <input
            type="number"
            min="1"
            className="px-3 py-2 border rounded-md w-20"
            placeholder="ID"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const id = parseInt((e.target as HTMLInputElement).value);
                if (id > 0) {
                  handleLoadDataBuilder(id);
                }
              }
            }}
          />
          <Button
            size="sm"
            color="primary"
            variant="flat"
            onPress={() => {
              const input = document.querySelector('input[type="number"]') as HTMLInputElement;
              const id = parseInt(input.value);
              if (id > 0) {
                handleLoadDataBuilder(id);
              }
            }}
          >
            Switch
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        <Tabs aria-label="Data Builder Tabs" fullWidth classNames={{ tabList: "gap-0" }}>
          <Tab
            key="groups"
            title={
              <div className="flex items-center gap-2">
                <Icon icon="lucide:layers" width={18} />
                <span>Product Groups</span>
                <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">{productGroups.length}</span>
              </div>
            }
          >
            <div className="p-6">
              <ProductGroupsManager />
            </div>
          </Tab>

          <Tab
            key="ranges"
            title={
              <div className="flex items-center gap-2">
                <Icon icon="lucide:grid-3x3" width={18} />
                <span>Product Ranges</span>
                <span className="text-xs bg-secondary-100 text-secondary-800 px-2 py-0.5 rounded-full">{productRanges.length}</span>
              </div>
            }
          >
            <div className="p-6">
              <ProductRangesManager />
            </div>
          </Tab>

          <Tab
            key="products"
            title={
              <div className="flex items-center gap-2">
                <Icon icon="lucide:package" width={18} />
                <span>Products</span>
                <span className="text-xs bg-success-100 text-success-800 px-2 py-0.5 rounded-full">{products.length}</span>
              </div>
            }
          >
            <div className="p-6">
              <ProductsManager stepperID={currentStepperId} />
            </div>
          </Tab>

          <Tab
            key="relationships"
            title={
              <div className="flex items-center gap-2">
                <Icon icon="lucide:link" width={18} />
                <span>Relationships</span>
              </div>
            }
          >
            <div className="p-6">
              <RelationshipsManager />
            </div>
          </Tab>

          <Tab
            key="preview"
            title={
              <div className="flex items-center gap-2">
                <Icon icon="lucide:eye" width={18} />
                <span>Data Preview</span>
              </div>
            }
          >
            <div className="p-6">
              <DataPreview />
            </div>
          </Tab>
        </Tabs>
      </Card>
      {/* Generate Folders Modal */}
      <GenerateFoldersModal isOpen={isFoldersModalOpen} onOpenChange={onFoldersModalOpenChange} />
      {/* Fetch from Digital Ocean Modal */}
      <FetchFromDigitalOceanModal isOpen={isDigitalOceanModalOpen} onOpenChange={onDigitalOceanModalOpenChange} />
    </div>
  );
};
