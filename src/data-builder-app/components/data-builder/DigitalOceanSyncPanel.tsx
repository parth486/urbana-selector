import React, { useState, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Checkbox,
  Chip,
  Progress,
  Alert,
} from "@heroui/react";
import { Icon } from "@iconify/react";

interface SyncItem {
  id: string;
  name: string;
  type: 'group' | 'range' | 'product';
  exists?: boolean;
  checked?: boolean;
}

interface DigitalOceanSyncPanelProps {
  items: SyncItem[];
  type: 'groups' | 'ranges' | 'products';
  title: string;
  onItemCheck: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onSync: (selectedIds: string[]) => Promise<void>;
}

export const DigitalOceanSyncPanel: React.FC<DigitalOceanSyncPanelProps> = ({
  items,
  type,
  title,
  onItemCheck,
  onSelectAll,
  onSync,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const selectedItems = items.filter(item => item.checked);
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const isIndeterminate = selectedItems.length > 0 && selectedItems.length < items.length;

  const handleSync = useCallback(async () => {
    const selectedIds = selectedItems.map(item => item.id);
    if (selectedIds.length === 0) return;

    setIsLoading(true);
    setSyncResult(null);

    try {
      await onSync(selectedIds);
      setSyncResult({
        success: true,
        message: `Successfully created ${selectedIds.length} folder(s) in Digital Ocean`,
      });
    } catch (error) {
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedItems, onSync]);

  const existingCount = items.filter(item => item.exists).length;
  const missingCount = items.length - existingCount;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:cloud-upload" width={20} />
          <h4 className="text-lg font-semibold">{title} - Digital Ocean Sync</h4>
        </div>
        <div className="flex items-center gap-2">
          <Chip size="sm" variant="flat" color="success">
            {existingCount} exist
          </Chip>
          <Chip size="sm" variant="flat" color="warning">
            {missingCount} missing
          </Chip>
        </div>
      </CardHeader>
      
      <CardBody className="space-y-4">
        {syncResult && (
          <Alert
            color={syncResult.success ? "success" : "danger"}
            title={syncResult.success ? "Sync Successful" : "Sync Failed"}
            description={syncResult.message}
            onClose={() => setSyncResult(null)}
          />
        )}

        {items.length === 0 ? (
          <div className="text-center py-8 text-foreground-500">
            <Icon icon="lucide:folder-x" width={48} className="mx-auto mb-2 opacity-50" />
            <p>No {type} available to sync</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Checkbox
                isSelected={allSelected}
                isIndeterminate={isIndeterminate}
                onChange={(checked) => onSelectAll(checked)}
              >
                Select All ({items.length})
              </Checkbox>
              
              <Button
                color="primary"
                variant="flat"
                size="sm"
                onPress={handleSync}
                isLoading={isLoading}
                isDisabled={selectedItems.length === 0 || isLoading}
                startContent={isLoading ? null : <Icon icon="lucide:upload" width={16} />}
              >
                {isLoading ? 'Creating Folders...' : `Create ${selectedItems.length} Folder(s)`}
              </Button>
            </div>

            {isLoading && (
              <div className="space-y-2">
                <Progress 
                  size="sm" 
                  isIndeterminate 
                  color="primary"
                  label="Creating folders in Digital Ocean..."
                />
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-divider hover:bg-default-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      isSelected={item.checked || false}
                      onChange={(checked) => onItemCheck(item.id, checked)}
                    />
                    <div className="flex items-center gap-2">
                      <Icon 
                        icon={
                          item.type === 'group' ? 'lucide:layers' :
                          item.type === 'range' ? 'lucide:grid-3x3' : 'lucide:package'
                        } 
                        width={16} 
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </div>
                  
                  <Chip
                    size="sm"
                    variant="flat"
                    color={item.exists ? "success" : "warning"}
                    startContent={
                      <Icon 
                        icon={item.exists ? "lucide:check" : "lucide:cloud-upload"} 
                        width={12} 
                      />
                    }
                  >
                    {item.exists ? "Exists" : "Missing"}
                  </Chip>
                </div>
              ))}
            </div>

            {selectedItems.length > 0 && (
              <div className="bg-primary/10 rounded-lg p-3">
                <p className="text-sm text-primary font-medium">
                  {selectedItems.length} folder(s) will be created in Digital Ocean Spaces
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedItems.slice(0, 5).map((item) => (
                    <Chip key={item.id} size="sm" variant="flat" color="primary">
                      {item.name}
                    </Chip>
                  ))}
                  {selectedItems.length > 5 && (
                    <Chip size="sm" variant="flat" color="default">
                      +{selectedItems.length - 5} more
                    </Chip>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
};