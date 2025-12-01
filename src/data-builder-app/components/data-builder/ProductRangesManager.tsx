import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Image,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Checkbox,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataBuilderStore, ProductRange } from "../../stores/useDataBuilderStore";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

const TagInput: React.FC<TagInputProps> = ({ tags, onTagsChange }) => {
  const [inputValue, setInputValue] = React.useState("");

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (!tags.includes(newTag)) {
        onTagsChange([...tags, newTag]);
      }
      setInputValue("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="Type a tag and press Enter"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleAddTag}
        classNames={{ input: "urbana-input" }}
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Chip key={tag} onClose={() => handleRemoveTag(tag)} variant="flat" size="sm">
              {tag}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
};

export const ProductRangesManager: React.FC = () => {
  const {
    productRanges,
    productGroups,
    addProductRange,
    updateProductRange,
    removeProductRange,
    getProductsForRange,
    linkRangeToGroup,
    unlinkRangeFromGroup,
    relationships,
  } = useDataBuilderStore();

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [editingRange, setEditingRange] = React.useState<ProductRange | null>(null);
  const [formData, setFormData] = React.useState<Omit<ProductRange, "id">>({
    name: "",
    image: "",
    description: "",
    tags: [],
    active: true,
    groupName: "",
  });
  const [selectedGroups, setSelectedGroups] = React.useState<Set<string>>(new Set());
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleAddRange = () => {
    setEditingRange(null);
    setFormData({
      name: "",
      image: "",
      description: "",
      tags: [],
      active: true,
      groupName: "",
    });
    setSelectedGroups(new Set());
    setErrors({});
    onOpen();
  };

  const handleEditRange = (range: ProductRange) => {
    setEditingRange(range);
    setFormData({
      name: range.name,
      image: range.image,
      description: range.description,
      tags: [...range.tags],
      active: range.active,
      groupName: range.groupName || "",
    });

    // Find which groups this range belongs to
    const linkedGroups = new Set<string>();
    Object.entries(relationships.groupToRanges).forEach(([groupId, rangeIds]) => {
      if (rangeIds.includes(range.id)) {
        linkedGroups.add(groupId);
      }
    });
    setSelectedGroups(linkedGroups);

    setErrors({});
    onOpen();
  };

  const handleDeleteRange = (rangeId: string) => {
    const productsCount = getProductsForRange(rangeId).length;
    const message =
      productsCount > 0
        ? `Are you sure you want to delete this product range? This will also remove ${productsCount} associated product(s).`
        : "Are you sure you want to delete this product range?";

    if (confirm(message)) {
      removeProductRange(rangeId);
    }
  };

  const handleInputChange = (field: keyof Omit<ProductRange, "id">, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when field is edited
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    // Check for duplicate names (excluding current range when editing)
    const isDuplicate = productRanges.some(
      (range) => range.name.toLowerCase() === formData.name.toLowerCase() && (!editingRange || range.id !== editingRange.id)
    );

    if (isDuplicate) {
      newErrors.name = "A product range with this name already exists";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (selectedGroups.size === 0) {
      newErrors.groups = "Please select at least one product group";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRenameInDigitalOcean = async (oldName: string, newName: string, groupName: string) => {
    try {
      const oldPath = `${groupName}/${oldName}`;
      const newPath = `${groupName}/${newName}`;
      
      const apiUrl = (window as any).urbanaAdmin?.apiUrl || '/wp-json/urbana/v1/';
      const response = await fetch(`${apiUrl}digital-ocean/rename-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': (window as any).urbanaAdmin?.nonce || '',
        },
        body: JSON.stringify({ 
          old_path: oldPath,
          new_path: newPath
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to rename folder');
      }

      return true;
    } catch (error) {
      console.error('Failed to rename folder in Digital Ocean:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    let rangeId: string;
    let needsRename = false;
    let oldGroupName: string | null = null;
    let oldRangeName: string | null = null;

    // Always use the first selected group as the main groupName for backend
    const groupName = productGroups.find(g => g.id === Array.from(selectedGroups)[0])?.name || "";
    const formDataWithGroup = { ...formData, groupName };

    if (editingRange) {
      // Check if name has changed
      needsRename = editingRange.name !== formData.name;
      oldRangeName = editingRange.name;
      
      // Get old group name for rename path
      if (needsRename) {
        const oldGroupId = Object.entries(relationships.groupToRanges).find(([_, rangeIds]) => 
          rangeIds.includes(editingRange.id)
        )?.[0];
        
        if (oldGroupId) {
          const oldGroup = productGroups.find(g => g.id === oldGroupId);
          if (oldGroup) {
            oldGroupName = oldGroup.name;
          }
        }
      }

      // Update existing range
      updateProductRange(editingRange.id, formDataWithGroup);
      rangeId = editingRange.id;

      // Update group relationships - remove from all groups first
      Object.keys(relationships.groupToRanges).forEach((groupId) => {
        unlinkRangeFromGroup(groupId, editingRange.id);
      });
    } else {
      // Add new range
      addProductRange(formDataWithGroup);
      // Generate the same ID that the store will use
      rangeId = formData.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }

    // Link to selected groups
    selectedGroups.forEach((groupId) => {
      linkRangeToGroup(groupId, rangeId);
    });

    // Handle Digital Ocean rename if needed
    if (needsRename && oldRangeName && oldGroupName) {
      const shouldRename = confirm(
        `The range name has changed from "${oldRangeName}" to "${formData.name}".\n\n` +
        `Do you want to rename the folder in Digital Ocean as well?\n` +
        `This will move all contents from:\n` +
        `  ${oldGroupName}/${oldRangeName}/\n` +
        `to:\n` +
        `  ${oldGroupName}/${formData.name}/`
      );

      if (shouldRename) {
        try {
          await handleRenameInDigitalOcean(oldRangeName, formData.name, oldGroupName);
          alert(`✅ Successfully renamed folder in Digital Ocean from "${oldRangeName}" to "${formData.name}"`);
        } catch (error) {
          alert(`❌ Failed to rename folder in Digital Ocean. Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThe range has been updated in WordPress, but the Digital Ocean folder was not renamed.`);
        }
      }
    }

    onClose();
  };

  // Get ranges grouped by their parent groups for better organization
  const getGroupedRanges = () => {
    const grouped: Record<string, ProductRange[]> = {};
    const ungrouped: ProductRange[] = [];

    productRanges.forEach((range) => {
      let hasGroup = false;
      Object.entries(relationships.groupToRanges).forEach(([groupId, rangeIds]) => {
        if (rangeIds.includes(range.id)) {
          const group = productGroups.find((g) => g.id === groupId);
          if (group) {
            if (!grouped[group.name]) grouped[group.name] = [];
            grouped[group.name].push(range);
            hasGroup = true;
          }
        }
      });

      if (!hasGroup) {
        ungrouped.push(range);
      }
    });

    return { grouped, ungrouped };
  };

  const { grouped, ungrouped } = getGroupedRanges();

  // Digital Ocean Sync State - organized by groups like the Manage Ranges tab
  const [syncItemsGrouped, setSyncItemsGrouped] = React.useState<{
    grouped: Record<string, Array<{
      id: string;
      name: string;
      type: 'range';
      exists?: boolean;
      checked?: boolean;
    }>>;
    ungrouped: Array<{
      id: string;
      name: string;
      type: 'range';
      exists?: boolean;
      checked?: boolean;
    }>;
  }>({
    grouped: {},
    ungrouped: []
  });

  // Function to check folder existence with enhanced console logging
  const checkFolderExistence = React.useCallback(async () => {
    try {
      const apiUrl = (window as any).urbanaAdmin?.apiUrl || '/wp-json/urbana/v1/';
      const response = await fetch(`${apiUrl}digital-ocean/check-folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': (window as any).urbanaAdmin?.nonce || '',
        },
        body: JSON.stringify({ type: 'ranges' }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.results) {
          
          // Update sync items with existence status
          setSyncItemsGrouped(prev => {
            const newGrouped = { ...prev.grouped };
            const newUngrouped = [...prev.ungrouped];

            // Update grouped items
            Object.keys(newGrouped).forEach(groupName => {
              newGrouped[groupName] = newGrouped[groupName].map(item => {
                // Build expected folder path: GroupName/RangeName/
                const groupNameNorm = groupName.toLowerCase().replace(/\/+$/, '');
                const rangeNameNorm = (item.name || '').toLowerCase().replace(/\/+$/, '');
                const expectedPath = groupNameNorm + '/' + rangeNameNorm + '/';
                const existenceData = result.results.find((r: any) => {
                  // Normalize backend folder_path or id
                  const folderPath = (r.folder_path || r.id || '').toLowerCase().replace(/\/+$/, '');
                  return folderPath === (groupNameNorm + '/' + rangeNameNorm);
                });
                return {
                  ...item,
                  exists: existenceData ? existenceData.exists : false
                };
              });
            });

            // Update ungrouped items
            newUngrouped.forEach((item, index) => {
              // For ungrouped, just try to match by range name (could be improved if group known)
              const rangeNameNorm = (item.name || '').toLowerCase().replace(/\/+$/, '');
              const existenceData = result.results.find((r: any) => {
                const folderPath = (r.folder_path || r.id || '').toLowerCase().replace(/\/+$/, '');
                return folderPath.endsWith('/' + rangeNameNorm);
              });
              if (existenceData) {
                newUngrouped[index] = { ...item, exists: existenceData.exists };
              }
            });

            return {
              grouped: newGrouped,
              ungrouped: newUngrouped
            };
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to check folder existence:', error);
    }
  }, []);

  React.useEffect(() => {
    // Initialize sync items from grouped product ranges
    const { grouped, ungrouped } = getGroupedRanges();
    
    const syncGrouped: Record<string, Array<{
      id: string;
      name: string;
      type: 'range';
      exists?: boolean;
      checked?: boolean;
    }>> = {};

    // Process grouped ranges
    Object.entries(grouped).forEach(([groupName, ranges]) => {
      syncGrouped[groupName] = ranges.map(range => ({
        id: range.id,
        name: range.name,
        type: 'range' as const,
        exists: false,
        checked: false,
      }));
    });

    // Process ungrouped ranges
    const syncUngrouped = ungrouped.map(range => ({
      id: range.id,
      name: range.name,
      type: 'range' as const,
      exists: false,
      checked: false,
    }));

    setSyncItemsGrouped({
      grouped: syncGrouped,
      ungrouped: syncUngrouped
    });

    // Check folder existence after state is set
    checkFolderExistence();
  }, [productRanges, relationships, productGroups]); // Removed checkFolderExistence from deps

  const handleItemCheck = (id: string, checked: boolean) => {
    setSyncItemsGrouped(prev => {
      const newGrouped = { ...prev.grouped };
      const newUngrouped = [...prev.ungrouped];

      // Check in grouped items
      Object.keys(newGrouped).forEach(groupName => {
        newGrouped[groupName] = newGrouped[groupName].map(item => 
          item.id === id ? { ...item, checked } : item
        );
      });

      // Check in ungrouped items
      const ungroupedIndex = newUngrouped.findIndex(item => item.id === id);
      if (ungroupedIndex !== -1) {
        newUngrouped[ungroupedIndex] = { ...newUngrouped[ungroupedIndex], checked };
      }

      return {
        grouped: newGrouped,
        ungrouped: newUngrouped
      };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSyncItemsGrouped(prev => {
      const newGrouped = { ...prev.grouped };
      const newUngrouped = [...prev.ungrouped];

      // Update all grouped items
      Object.keys(newGrouped).forEach(groupName => {
        newGrouped[groupName] = newGrouped[groupName].map(item => ({ ...item, checked }));
      });

      // Update all ungrouped items
      newUngrouped.forEach((item, index) => {
        newUngrouped[index] = { ...item, checked };
      });

      return {
        grouped: newGrouped,
        ungrouped: newUngrouped
      };
    });
  };

  const handleSync = async (selectedIds: string[]) => {
    try {
      const apiUrl = (window as any).urbanaAdmin?.apiUrl || '/wp-json/urbana/v1/';
      const response = await fetch(`${apiUrl}digital-ocean/create-range-folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': (window as any).urbanaAdmin?.nonce || '',
        },
        body: JSON.stringify({ range_ids: selectedIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to create folders');
      }

      // Update exists status for synced items
      setSyncItemsGrouped(prev => {
        const newGrouped = { ...prev.grouped };
        const newUngrouped = [...prev.ungrouped];

        // Update grouped items
        Object.keys(newGrouped).forEach(groupName => {
          newGrouped[groupName] = newGrouped[groupName].map(item => 
            selectedIds.includes(item.id) 
              ? { ...item, exists: true, checked: false }
              : item
          );
        });

        // Update ungrouped items
        newUngrouped.forEach((item, index) => {
          if (selectedIds.includes(item.id)) {
            newUngrouped[index] = { ...item, exists: true, checked: false };
          }
        });

        return {
          grouped: newGrouped,
          ungrouped: newUngrouped
        };
      });

    } catch (error) {
      throw error;
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold">Product Ranges</h3>
          <p className="text-sm text-foreground-500">Define specific product lines within each group</p>
        </div>
        <Button
          color="primary"
          onPress={handleAddRange}
          startContent={<Icon icon="lucide:plus" width={18} />}
          isDisabled={productGroups.length === 0}
        >
          Add Product Range
        </Button>
      </div>

      <Tabs aria-label="Product Ranges Options" className="mb-6">
        <Tab key="manage" title={
          <div className="flex items-center space-x-2">
            <Icon icon="lucide:grid-3x3" width={16} />
            <span>Manage Ranges</span>
          </div>
        }>
          <div className="mt-4">

      {productGroups.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Icon icon="lucide:alert-circle" width={48} className="text-warning-500" />
              <div>
                <h3 className="text-lg font-semibold text-foreground-600">No Product Groups Available</h3>
                <p className="text-sm text-foreground-500">You need to create product groups first before adding ranges</p>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : productRanges.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Icon icon="lucide:grid-3x3" width={48} className="text-foreground-300" />
              <div>
                <h3 className="text-lg font-semibold text-foreground-600">No Product Ranges Yet</h3>
                <p className="text-sm text-foreground-500">Create your first product range to organize your products</p>
              </div>
              <Button color="primary" onPress={handleAddRange} startContent={<Icon icon="lucide:plus" width={18} />}>
                Add Product Range
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Grouped Ranges */}
          {Object.entries(grouped).map(([groupName, ranges]) => (
            <div key={groupName}>
              <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Icon icon="lucide:layers" width={18} />
                {groupName}
                <Chip size="sm" variant="flat">
                  {ranges.length} range{ranges.length !== 1 ? "s" : ""}
                </Chip>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ranges.map((range) => (
                  <RangeCard key={range.id} range={range} onEdit={handleEditRange} onDelete={handleDeleteRange} />
                ))}
              </div>
            </div>
          ))}

          {/* Ungrouped Ranges */}
          {ungrouped.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-3 flex items-center gap-2 text-warning-600">
                <Icon icon="lucide:alert-triangle" width={18} />
                Ungrouped Ranges
                <Chip size="sm" variant="flat" color="warning">
                  {ungrouped.length} range{ungrouped.length !== 1 ? "s" : ""}
                </Chip>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ungrouped.map((range) => (
                  <RangeCard key={range.id} range={range} onEdit={handleEditRange} onDelete={handleDeleteRange} />
                ))}
              </div>
            </div>
          )}
          </div>
        )}
          </div>
        </Tab>
        
        <Tab key="sync" title={
          <div className="flex items-center space-x-2">
            <Icon icon="lucide:cloud-upload" width={16} />
            <span>Digital Ocean Sync</span>
          </div>
        }>
          <div className="mt-4">
            {/* Card-based Digital Ocean Sync Panel matching Product Groups */}
            <Card className="urbana-card">
              <CardHeader className="flex gap-3">
                <Icon icon="lucide:cloud-upload" width={24} />
                <div className="flex flex-col">
                  <p className="text-md font-semibold">Product Ranges - Digital Ocean Sync</p>
                  <p className="text-small text-default-500">
                    Organize by groups like the Manage Ranges tab
                  </p>
                </div>
              </CardHeader>
              <CardBody>
                {/* Global controls */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    color="primary" 
                    variant="flat"
                    size="sm"
                    onPress={() => handleSelectAll(true)}
                    startContent={<Icon icon="lucide:check-square" width={16} />}
                  >
                    Select All
                  </Button>
                  <Button
                    color="default" 
                    variant="flat"
                    size="sm"
                    onPress={() => handleSelectAll(false)}
                    startContent={<Icon icon="lucide:square" width={16} />}
                  >
                    Clear All
                  </Button>
                  <Button
                    color="primary"
                    size="sm"
                    onPress={() => {
                      const selectedIds: string[] = [];
                      Object.values(syncItemsGrouped.grouped).forEach(ranges => {
                        ranges.forEach(range => {
                          if (range.checked) selectedIds.push(range.id);
                        });
                      });
                      syncItemsGrouped.ungrouped.forEach(range => {
                        if (range.checked) selectedIds.push(range.id);
                      });
                      handleSync(selectedIds);
                    }}
                    isDisabled={(() => {
                      let hasSelected = false;
                      Object.values(syncItemsGrouped.grouped).forEach(ranges => {
                        ranges.forEach(range => {
                          if (range.checked) hasSelected = true;
                        });
                      });
                      syncItemsGrouped.ungrouped.forEach(range => {
                        if (range.checked) hasSelected = true;
                      });
                      return !hasSelected;
                    })()}
                    startContent={<Icon icon="lucide:upload" width={16} />}
                  >
                    Sync Selected
                  </Button>
                </div>

                {Object.keys(syncItemsGrouped.grouped).length === 0 && syncItemsGrouped.ungrouped.length === 0 ? (
                  <div className="text-center py-8 text-foreground-500">
                    <Icon icon="lucide:folder-x" width={48} className="mx-auto mb-2 opacity-50" />
                    <p>No ranges available to sync</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Grouped ranges with card layout */}
                    {Object.entries(syncItemsGrouped.grouped).map(([groupName, ranges]) => (
                      <div key={groupName} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Icon icon="lucide:layers" width={18} className="text-primary" />
                          <h4 className="font-semibold text-lg text-primary">{groupName}</h4>
                          <Chip size="sm" variant="flat" color="primary">
                            {ranges.length} range{ranges.length !== 1 ? 's' : ''}
                          </Chip>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {ranges.map((range) => {
                            const rangeData = productRanges.find(r => r.id === range.id);
                            const productsCount = rangeData ? getProductsForRange(range.id).length : 0;

                            return (
                              <Card 
                                key={range.id} 
                                className={`hover:shadow-lg transition-all cursor-pointer border-2 ${
                                  range.checked 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-transparent hover:border-primary/30'
                                }`}
                                isPressable
                                onPress={() => handleItemCheck(range.id, !range.checked)}
                              >
                                <CardHeader className="pb-3">
                                  <div className="flex justify-between items-start w-full">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                                          <Icon icon="lucide:grid-3x3" width={20} className="text-secondary-600" />
                                        </div>
                                        <div className="absolute -top-1 -right-1">
                                          <Checkbox
                                            isSelected={range.checked || false}
                                            onValueChange={(checked) => {
                                              handleItemCheck(range.id, checked);
                                            }}
                                            size="sm"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="text-md font-semibold">{range.name}</h4>
                                        <Chip size="sm" variant="flat" color="secondary">
                                          {productsCount} product{productsCount !== 1 ? 's' : ''}
                                        </Chip>
                                      </div>
                                    </div>
                                    <Chip
                                      size="sm"
                                      variant="flat"
                                      color={range.exists ? "success" : "warning"}
                                      startContent={
                                        <Icon 
                                          icon={range.exists ? "lucide:check-circle" : "lucide:alert-circle"} 
                                          width={14} 
                                        />
                                      }
                                    >
                                      {range.exists ? "Exists" : "Missing"}
                                    </Chip>
                                  </div>
                                </CardHeader>
                                {rangeData && (
                                  <CardBody className="pt-0">
                                    <p className="text-sm text-foreground-600">{rangeData.description || 'No description'}</p>
                                  </CardBody>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Ungrouped ranges with card layout */}
                    {syncItemsGrouped.ungrouped.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Icon icon="lucide:alert-triangle" width={18} className="text-warning" />
                          <h4 className="font-semibold text-lg text-warning">Ungrouped Ranges</h4>
                          <Chip size="sm" variant="flat" color="warning">
                            {syncItemsGrouped.ungrouped.length} range{syncItemsGrouped.ungrouped.length !== 1 ? 's' : ''}
                          </Chip>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {syncItemsGrouped.ungrouped.map((range) => {
                            const rangeData = productRanges.find(r => r.id === range.id);
                            const productsCount = rangeData ? getProductsForRange(range.id).length : 0;

                            return (
                              <Card 
                                key={range.id} 
                                className={`hover:shadow-lg transition-all cursor-pointer border-2 ${
                                  range.checked 
                                    ? 'border-warning bg-warning/5' 
                                    : 'border-transparent hover:border-warning/30'
                                }`}
                                isPressable
                                onPress={() => handleItemCheck(range.id, !range.checked)}
                              >
                                <CardHeader className="pb-3">
                                  <div className="flex justify-between items-start w-full">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                                          <Icon icon="lucide:grid-3x3" width={20} className="text-warning-600" />
                                        </div>
                                        <div className="absolute -top-1 -right-1">
                                          <Checkbox
                                            isSelected={range.checked || false}
                                            onValueChange={(checked) => {
                                              handleItemCheck(range.id, checked);
                                            }}
                                            size="sm"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="text-md font-semibold">{range.name}</h4>
                                        <Chip size="sm" variant="flat" color="warning">
                                          {productsCount} product{productsCount !== 1 ? 's' : ''}
                                        </Chip>
                                      </div>
                                    </div>
                                    <Chip
                                      size="sm"
                                      variant="flat"
                                      color={range.exists ? "success" : "warning"}
                                      startContent={
                                        <Icon 
                                          icon={range.exists ? "lucide:check-circle" : "lucide:alert-circle"} 
                                          width={14} 
                                        />
                                      }
                                    >
                                      {range.exists ? "Exists" : "Missing"}
                                    </Chip>
                                  </div>
                                </CardHeader>
                                {rangeData && (
                                  <CardBody className="pt-0">
                                    <p className="text-sm text-foreground-600">{rangeData.description || 'No description'}</p>
                                  </CardBody>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" className="urbana-modal">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{editingRange ? "Edit Product Range" : "Add Product Range"}</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Name"
                    placeholder="Enter range name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    errorMessage={errors.name}
                    isInvalid={!!errors.name}
                    isRequired
                    classNames={{ input: "urbana-input" }}
                  />

                  <Select
                    label="Product Groups"
                    placeholder="Select product groups for this range"
                    selectionMode="multiple"
                    selectedKeys={selectedGroups}
                    onSelectionChange={(keys) => setSelectedGroups(keys as Set<string>)}
                    errorMessage={errors.groups}
                    isInvalid={!!errors.groups}
                    isRequired
                  >
                    {productGroups.map((group) => (
                      <SelectItem key={group.id}>
                        <div className="flex items-center gap-2">
                          <Icon icon={group.icon} width={16} />
                          {group.name}
                        </div>
                      </SelectItem>
                    ))}
                  </Select>

                  <Input
                    label="Image URL"
                    placeholder="Enter image URL (optional)"
                    value={formData.image}
                    onChange={(e) => handleInputChange("image", e.target.value)}
                    classNames={{ input: "urbana-input" }}
                  />

                  <Textarea
                    label="Description"
                    placeholder="Enter range description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    errorMessage={errors.description}
                    isInvalid={!!errors.description}
                    isRequired
                    rows={3}
                    classNames={{ input: "urbana-input" }}
                  />

                  <div>
                    <label className="text-sm font-medium text-foreground-700 mb-2 block">Tags</label>
                    <TagInput tags={formData.tags} onTagsChange={(tags) => handleInputChange("tags", tags)} />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleSubmit}>
                  {editingRange ? "Update" : "Add"} Range
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

interface RangeCardProps {
  range: ProductRange;
  onEdit: (range: ProductRange) => void;
  onDelete: (rangeId: string) => void;
}

const RangeCard: React.FC<RangeCardProps> = ({ range, onEdit, onDelete }) => {
  const { getProductsForRange, updateProductRange } = useDataBuilderStore();
  const productsCount = getProductsForRange(range.id).length;

  const handleToggleActive = () => {
    updateProductRange(range.id, { active: typeof range.active === "undefined" ? false : !range.active });
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start w-full">
          <div className="flex items-center gap-3">
            {range.image ? (
              <Image src={range.image} alt={range.name} width={40} height={40} className="rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                <Icon icon="lucide:grid-3x3" width={20} className="text-secondary-600" />
              </div>
            )}
            <div>
              <h4 className="text-lg font-semibold">{range.name}</h4>
              {typeof range.active !== "undefined" && !range.active && (
                <Chip size="sm" variant="flat" color="warning">
                  Inactive
                </Chip>
              )}
              <Chip size="sm" variant="flat" color="secondary">
                {productsCount} product{productsCount !== 1 ? "s" : ""}
              </Chip>
            </div>
          </div>
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm">
                <Icon icon="lucide:more-vertical" width={16} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Range Actions">
              <DropdownItem key="edit" startContent={<Icon icon="lucide:edit" width={16} />} onPress={() => onEdit(range)}>
                Edit
              </DropdownItem>
              <DropdownItem
                key="toggle-active"
                startContent={
                  <Icon icon={typeof range.active !== "undefined" && !range.active ? "lucide:eye" : "lucide:eye-off"} width={16} />
                }
                onPress={handleToggleActive}
              >
                {typeof range.active !== "undefined" && !range.active ? "Activate" : "Deactivate"}
              </DropdownItem>
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                startContent={<Icon icon="lucide:trash" width={16} />}
                onPress={() => onDelete(range.id)}
              >
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <p className="text-sm text-foreground-600 mb-2">{range.description}</p>
        {range.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {range.tags.map((tag) => (
              <Chip key={tag} size="sm" variant="flat" color="default">
                {tag}
              </Chip>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
