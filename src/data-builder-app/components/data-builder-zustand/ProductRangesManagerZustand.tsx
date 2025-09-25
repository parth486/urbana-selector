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

export const ProductRangesManagerZustand: React.FC = () => {
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

  const handleSubmit = () => {
    if (!validateForm()) return;

    let rangeId: string;

    if (editingRange) {
      // Update existing range
      updateProductRange(editingRange.id, formData);
      rangeId = editingRange.id;

      // Update group relationships - remove from all groups first
      Object.keys(relationships.groupToRanges).forEach((groupId) => {
        unlinkRangeFromGroup(groupId, editingRange.id);
      });
    } else {
      // Add new range
      addProductRange(formData);
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

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
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
  const { getProductsForRange } = useDataBuilderStore();
  const productsCount = getProductsForRange(range.id).length;

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
