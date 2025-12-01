import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
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
  Avatar,
  Tabs,
  Tab,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataBuilderStore, ProductGroup } from "../../stores/useDataBuilderStore";
import { DigitalOceanSyncPanel } from "./DigitalOceanSyncPanel";

interface IconSelectorProps {
  selectedIcon: string;
  onIconSelect: (icon: string) => void;
}

const IconSelector: React.FC<IconSelectorProps> = ({ selectedIcon, onIconSelect }) => {
  const icons = [
    "lucide:box",
    "lucide:home",
    "lucide:bath",
    "lucide:route",
    "lucide:wheelchair",
    "lucide:armchair",
    "lucide:lamp",
    "lucide:tree",
    "lucide:building",
    "lucide:car",
    "lucide:tools",
    "lucide:shield",
  ];

  return (
    <div className="grid grid-cols-6 gap-2">
      {icons.map((icon) => (
        <Button
          key={icon}
          isIconOnly
          variant={selectedIcon === icon ? "solid" : "bordered"}
          color={selectedIcon === icon ? "primary" : "default"}
          onPress={() => onIconSelect(icon)}
          className="h-12 w-12"
        >
          <Icon icon={icon} width={20} />
        </Button>
      ))}
    </div>
  );
};

export const ProductGroupsManager: React.FC = () => {
  const { productGroups, addProductGroup, updateProductGroup, removeProductGroup, getRangesForGroup } = useDataBuilderStore();

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [editingGroup, setEditingGroup] = React.useState<ProductGroup | null>(null);
  const [formData, setFormData] = React.useState<Omit<ProductGroup, "id">>({
    name: "",
    icon: "lucide:box",
    description: "",
    active: true,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleAddGroup = () => {
    setEditingGroup(null);
    setFormData({
      name: "",
      icon: "lucide:box",
      description: "",
      active: true,
    });
    setErrors({});
    onOpen();
  };

  const handleEditGroup = (group: ProductGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      icon: group.icon,
      description: group.description,
      active: group.active,
    });
    setErrors({});
    onOpen();
  };

  const handleToggleActive = (group: ProductGroup) => {
    updateProductGroup(group.id, { active: typeof group.active === "undefined" ? false : !group.active });
  };

  const handleDeleteGroup = (groupId: string) => {
    const rangesCount = getRangesForGroup(groupId).length;
    const message =
      rangesCount > 0
        ? `Are you sure you want to delete this product group? This will also remove ${rangesCount} associated range(s) and their products.`
        : "Are you sure you want to delete this product group?";

    if (confirm(message)) {
      removeProductGroup(groupId);
    }
  };

  const handleInputChange = (field: keyof Omit<ProductGroup, "id">, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when field is edited
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleIconSelect = (icon: string) => {
    setFormData((prev) => ({ ...prev, icon }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    // Check for duplicate names (excluding current group when editing)
    const isDuplicate = productGroups.some(
      (group) => group.name.toLowerCase() === formData.name.toLowerCase() && (!editingGroup || group.id !== editingGroup.id)
    );

    if (isDuplicate) {
      newErrors.name = "A product group with this name already exists";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRenameInDigitalOcean = async (oldName: string, newName: string) => {
    const basePath = ''; // Get from settings if needed
    const oldPath = basePath ? `${basePath}/${oldName}` : oldName;
    const newPath = basePath ? `${basePath}/${newName}` : newName;

    try {
      const apiUrl = (window as any).urbanaAdmin?.apiUrl || '/wp-json/urbana/v1/';
      const response = await fetch(`${apiUrl}digital-ocean/rename-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': (window as any).urbanaAdmin?.nonce || '',
        },
        body: JSON.stringify({
          old_path: oldPath,
          new_path: newPath,
          type: 'group',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to rename folder in Digital Ocean:', error);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (editingGroup) {
      // Check if name has changed
      const nameChanged = editingGroup.name !== formData.name;
      
      if (nameChanged) {
        // Ask user if they want to rename the Digital Ocean folder too
        const shouldRename = confirm(
          `You've renamed "${editingGroup.name}" to "${formData.name}".\n\n` +
          `Do you also want to rename the folder in Digital Ocean Spaces?\n\n` +
          `• Yes = Rename folder and move all files (recommended)\n` +
          `• No = Only update WordPress, folder stays as "${editingGroup.name}"`
        );

        if (shouldRename) {
          const renamed = await handleRenameInDigitalOcean(editingGroup.name, formData.name);
          if (renamed) {
            alert(`✓ Folder renamed successfully in Digital Ocean!`);
          } else {
            alert(`⚠️ Failed to rename folder in Digital Ocean. You may need to rename it manually.`);
          }
        }
      }

      // Update existing group
      updateProductGroup(editingGroup.id, formData);
    } else {
      // Add new group
      addProductGroup(formData);
    }

    onClose();
  };

  // Digital Ocean Sync State
  const [syncItems, setSyncItems] = React.useState<Array<{
    id: string;
    name: string;
    type: 'group';
    exists?: boolean;
    checked?: boolean;
  }>>([]);

  // Function to check group folder existence
  const checkGroupFolderExistence = React.useCallback(async () => {
    try {
      const apiUrl = (window as any).urbanaAdmin?.apiUrl || '/wp-json/urbana/v1/';
      const response = await fetch(`${apiUrl}digital-ocean/check-folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': (window as any).urbanaAdmin?.nonce || '',
        },
        body: JSON.stringify({ type: 'groups' }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.results) {
          // Update sync items with existence status (case-insensitive, ignore trailing slash)
          setSyncItems(prev => 
            prev.map(item => {
              const existenceData = result.results.find((r: any) => {
                // Normalize both to lower case and remove trailing slashes
                const groupName = (item.name || item.id || '').toLowerCase().replace(/\/+$/, '');
                const folderId = (r.id || '').toLowerCase().replace(/\/+$/, '');
                return groupName === folderId;
              });
              return {
                ...item,
                exists: existenceData ? existenceData.exists : false
              };
            })
          );
        }
      }
    } catch (error) {
      console.error('Failed to check group folder existence:', error);
    }
  }, []);

  React.useEffect(() => {
    // Initialize sync items from product groups
    setSyncItems(
      productGroups.map(group => ({
        id: group.id,
        name: group.name,
        type: 'group' as const,
        exists: undefined, // undefined means 'checking'
        checked: false,
      }))
    );

    // Check folder existence after initializing
    setTimeout(() => checkGroupFolderExistence(), 500);
  }, [productGroups, checkGroupFolderExistence]);

  const handleItemCheck = (id: string, checked: boolean) => {
    setSyncItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, checked } : item
      )
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSyncItems(prev => 
      prev.map(item => ({ ...item, checked }))
    );
  };

  const handleSync = async (selectedIds: string[]) => {
    try {
      const apiUrl = (window as any).urbanaAdmin?.apiUrl || '/wp-json/urbana/v1/';
      const response = await fetch(`${apiUrl}digital-ocean/create-group-folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': (window as any).urbanaAdmin?.nonce || '',
        },
        body: JSON.stringify({ group_ids: selectedIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to create folders');
      }

      // Update exists status for synced items
      setSyncItems(prev => 
        prev.map(item => 
          selectedIds.includes(item.id) 
            ? { ...item, exists: true, checked: false }
            : item
        )
      );

    } catch (error) {
      throw error;
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold">Product Groups</h3>
          <p className="text-sm text-foreground-500">Organize your products into logical categories</p>
        </div>
        <Button color="primary" onPress={handleAddGroup} startContent={<Icon icon="lucide:plus" width={18} />}>
          Add Product Group
        </Button>
      </div>

      <Tabs aria-label="Product Groups Options" className="mb-6">
        <Tab key="manage" title={
          <div className="flex items-center space-x-2">
            <Icon icon="lucide:layers" width={16} />
            <span>Manage Groups</span>
          </div>
        }>
          <div className="mt-4">
            {productGroups.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Icon icon="lucide:layers" width={48} className="text-foreground-300" />
              <div>
                <h3 className="text-lg font-semibold text-foreground-600">No Product Groups Yet</h3>
                <p className="text-sm text-foreground-500">Create your first product group to get started</p>
              </div>
              <Button color="primary" onPress={handleAddGroup} startContent={<Icon icon="lucide:plus" width={18} />}>
                Add Product Group
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productGroups.map((group) => {
            const rangesCount = getRangesForGroup(group.id).length;

            return (
              <Card key={group.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start w-full">
                    <div className="flex items-center gap-3">
                      <Avatar icon={<Icon icon={group.icon} width={20} />} className="bg-primary-100 text-primary-800" size="sm" />
                      <div>
                        <h4 className="text-lg font-semibold">{group.name}</h4>
                        {typeof group.active !== "undefined" && !group.active && (
                          <Chip size="sm" variant="flat" color="warning">
                            Inactive
                          </Chip>
                        )}
                        <Chip size="sm" variant="flat" color="primary">
                          {rangesCount} range{rangesCount !== 1 ? "s" : ""}
                        </Chip>
                      </div>
                    </div>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly variant="light" size="sm">
                          <Icon icon="lucide:more-vertical" width={16} />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Group Actions">
                        <DropdownItem
                          key="edit"
                          startContent={<Icon icon="lucide:edit" width={16} />}
                          onPress={() => handleEditGroup(group)}
                        >
                          Edit
                        </DropdownItem>
                        <DropdownItem
                          key="toggle-active"
                          startContent={
                            <Icon
                              icon={typeof group.active !== "undefined" && !group.active ? "lucide:eye" : "lucide:eye-off"}
                              width={16}
                            />
                          }
                          onPress={() => handleToggleActive(group)}
                        >
                          {typeof group.active !== "undefined" && !group.active ? "Activate" : "Deactivate"}
                        </DropdownItem>
                        <DropdownItem
                          key="delete"
                          className="text-danger"
                          color="danger"
                          startContent={<Icon icon="lucide:trash" width={16} />}
                          onPress={() => handleDeleteGroup(group.id)}
                        >
                          Delete
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  <p className="text-sm text-foreground-600">{group.description}</p>
                </CardBody>
              </Card>
            );
          })}
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
            {/* Custom Product Groups Digital Ocean Sync with card layout matching Manage Groups */}
            <Card className="urbana-card">
              <CardHeader className="flex gap-3">
                <Icon icon="lucide:cloud-upload" width={24} />
                <div className="flex flex-col">
                  <p className="text-md font-semibold">Product Groups - Digital Ocean Sync</p>
                  <p className="text-small text-default-500">
                    Organize like the Manage Groups tab with card layout
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
                      const selectedIds = syncItems.filter(item => item.checked).map(item => item.id);
                      handleSync(selectedIds);
                    }}
                    isDisabled={!syncItems.some(item => item.checked)}
                    startContent={<Icon icon="lucide:upload" width={16} />}
                  >
                    Sync Selected
                  </Button>
                </div>

                {syncItems.length === 0 ? (
                  <div className="text-center py-8 text-foreground-500">
                    <Icon icon="lucide:folder-x" width={48} className="mx-auto mb-2 opacity-50" />
                    <p>No groups available to sync</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {syncItems.map((syncItem) => {
                      const group = productGroups.find(g => g.id === syncItem.id);
                      const rangesCount = group ? getRangesForGroup(group.id).length : 0;

                      return (
                        <Card 
                          key={syncItem.id} 
                          className={`hover:shadow-lg transition-all cursor-pointer border-2 ${
                            syncItem.checked 
                              ? 'border-primary bg-primary/5' 
                              : 'border-transparent hover:border-primary/30'
                          }`}
                          isPressable
                          onPress={() => handleItemCheck(syncItem.id, !syncItem.checked)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start w-full">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <Avatar 
                                    icon={<Icon icon={group?.icon || "lucide:layers"} width={20} />} 
                                    className="bg-primary-100 text-primary-800" 
                                    size="sm" 
                                  />
                                  {/* Selection indicator */}
                                  <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs transition-all ${
                                    syncItem.checked ? 'bg-primary' : 'bg-gray-300'
                                  }`}>
                                    {syncItem.checked ? (
                                      <Icon icon="lucide:check" width={10} />
                                    ) : null}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-lg font-semibold">{syncItem.name}</h4>
                                  <div className="flex gap-2">
                                    <Chip size="sm" variant="flat" color="primary">
                                      {rangesCount} range{rangesCount !== 1 ? "s" : ""}
                                    </Chip>
                                    <Chip
                                      size="sm"
                                      variant="flat"
                                      color={syncItem.exists === true ? "success" : syncItem.exists === false ? "warning" : "default"}
                                      startContent={
                                        syncItem.exists === undefined ? (
                                          <Icon icon="lucide:loader-2" width={12} className="animate-spin" />
                                        ) : syncItem.exists ? (
                                          <Icon icon="lucide:check" width={12} />
                                        ) : (
                                          <Icon icon="lucide:cloud-upload" width={12} />
                                        )
                                      }
                                    >
                                      {syncItem.exists === undefined ? "Checking..." : syncItem.exists ? "Exists" : "Missing"}
                                    </Chip>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardBody className="pt-0">
                            <p className="text-sm text-foreground-600">
                              {group?.description || "No description available"}
                            </p>
                            {syncItem.checked && (
                              <div className="mt-2 p-2 bg-primary/10 rounded text-xs text-primary">
                                ✓ Selected for sync
                              </div>
                            )}
                          </CardBody>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Selected items summary */}
                {syncItems.some(item => item.checked) && (
                  <div className="mt-4 bg-primary/10 rounded-lg p-3">
                    <p className="text-sm text-primary font-medium">
                      {syncItems.filter(item => item.checked).length} group folder(s) will be created in Digital Ocean Spaces
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {syncItems.filter(item => item.checked).slice(0, 5).map((item) => (
                        <Chip key={item.id} size="sm" variant="flat" color="primary">
                          {item.name}
                        </Chip>
                      ))}
                      {syncItems.filter(item => item.checked).length > 5 && (
                        <Chip size="sm" variant="flat" color="default">
                          +{syncItems.filter(item => item.checked).length - 5} more
                        </Chip>
                      )}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg" className="urbana-modal">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{editingGroup ? "Edit Product Group" : "Add Product Group"}</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Name"
                    placeholder="Enter group name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    errorMessage={errors.name}
                    isInvalid={!!errors.name}
                    isRequired
                    classNames={{ input: "urbana-input" }}
                  />

                  <div>
                    <label className="text-sm font-medium text-foreground-700 mb-2 block">Icon</label>
                    <IconSelector selectedIcon={formData.icon} onIconSelect={handleIconSelect} />
                  </div>

                  <Textarea
                    label="Description"
                    placeholder="Enter group description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    errorMessage={errors.description}
                    isInvalid={!!errors.description}
                    isRequired
                    rows={3}
                    classNames={{ input: "urbana-input" }}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleSubmit}>
                  {editingGroup ? "Update" : "Add"} Group
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
