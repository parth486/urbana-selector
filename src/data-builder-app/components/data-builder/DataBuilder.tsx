import React from "react";
import { Tabs, Tab, Card, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ProductGroupsManager } from "./ProductGroupsManager";
import { ProductRangesManager } from "./ProductRangesManager";
import { ProductsManager } from "./ProductsManager";
import { RelationshipsManager } from "./RelationshipsManager";
import { DataPreview } from "./DataPreview";
import { useDataBuilderStore } from "../../stores/useDataBuilderStore";

export const DataBuilder: React.FC = () => {
  const { productGroups, productRanges, products, relationships, exportData, importData, error } = useDataBuilderStore();

  const handleExportData = () => {
    const data = exportData();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "product-configurator-data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
      } catch (error) {
        console.error("Error parsing imported data:", error);
        alert("Invalid data format. Please check your JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Data Management ()</h2>
          <p className="text-sm text-foreground-500 mt-1">Manage product groups, ranges, products, and their relationships</p>
        </div>
        <div className="flex gap-2">
          <Button color="primary" variant="flat" onPress={handleExportData} startContent={<Icon icon="lucide:download" width={18} />}>
            Export Data
          </Button>
          <label className="cursor-pointer">
            <Button color="primary" variant="flat" as="span" startContent={<Icon icon="lucide:upload" width={18} />}>
              Import Data
            </Button>
            <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
          </label>
        </div>
      </div>

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
              <ProductsManager />
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
    </div>
  );
};
