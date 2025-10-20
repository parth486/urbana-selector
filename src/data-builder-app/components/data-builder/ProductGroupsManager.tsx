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
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataBuilderStore, ProductGroup } from "../../stores/useDataBuilderStore";

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

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (editingGroup) {
      // Update existing group
      updateProductGroup(editingGroup.id, formData);
    } else {
      // Add new group
      addProductGroup(formData);
    }

    onClose();
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
