import React from "react";
import { 
  Card, 
  CardBody, 
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
  useDisclosure
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { IconSelector } from "./IconSelector";

interface ProductGroup {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface ProductGroupsManagerProps {
  groups: ProductGroup[];
  onGroupsChange: (groups: ProductGroup[]) => void;
}

export const ProductGroupsManager: React.FC<ProductGroupsManagerProps> = ({ 
  groups, 
  onGroupsChange 
}) => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [editingGroup, setEditingGroup] = React.useState<ProductGroup | null>(null);
  const [formData, setFormData] = React.useState<ProductGroup>({
    id: '',
    name: '',
    icon: 'lucide:box',
    description: ''
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleAddGroup = () => {
    setEditingGroup(null);
    setFormData({
      id: '',
      name: '',
      icon: 'lucide:box',
      description: ''
    });
    setErrors({});
    onOpen();
  };

  const handleEditGroup = (group: ProductGroup) => {
    setEditingGroup(group);
    setFormData({ ...group });
    setErrors({});
    onOpen();
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm("Are you sure you want to delete this product group?")) {
      onGroupsChange(groups.filter(group => group.id !== groupId));
    }
  };

  const handleInputChange = (field: keyof ProductGroup, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Generate ID from name if it's a new group
    if (field === 'name' && !editingGroup) {
      const generatedId = value.toLowerCase().replace(/\s+/g, '-');
      setFormData(prev => ({ ...prev, id: generatedId }));
    }
    
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleIconSelect = (icon: string) => {
    setFormData(prev => ({ ...prev, icon }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!formData.id.trim()) {
      newErrors.id = "ID is required";
    } else if (
      !editingGroup && 
      groups.some(group => group.id === formData.id)
    ) {
      newErrors.id = "ID must be unique";
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
      onGroupsChange(
        groups.map(group => 
          group.id === editingGroup.id ? formData : group
        )
      );
    } else {
      // Add new group
      onGroupsChange([...groups, formData]);
    }
    
    onClose();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Product Groups</h3>
        <Button 
          color="primary" 
          onPress={handleAddGroup}
          startContent={<Icon icon="lucide:plus" width={18} />}
        >
          Add Product Group
        </Button>
      </div>
      
      <Card>
        <CardBody className="p-0">
          <Table removeWrapper aria-label="Product Groups Table">
            <TableHeader>
              <TableColumn>ICON</TableColumn>
              <TableColumn>NAME</TableColumn>
              <TableColumn>DESCRIPTION</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No product groups added yet.">
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <div className="w-10 h-10 rounded-full bg-default-100 flex items-center justify-center">
                      <Icon icon={group.icon} width={20} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-xs text-default-500">ID: {group.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="line-clamp-2">{group.description}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="flat" 
                        color="primary"
                        onPress={() => handleEditGroup(group)}
                        startContent={<Icon icon="lucide:edit" width={16} />}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="flat" 
                        color="danger"
                        onPress={() => handleDeleteGroup(group.id)}
                        startContent={<Icon icon="lucide:trash" width={16} />}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
      
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {editingGroup ? "Edit Product Group" : "Add Product Group"}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Name"
                      placeholder="Enter product group name"
                      value={formData.name}
                      onValueChange={(value) => handleInputChange('name', value)}
                      isRequired
                      isInvalid={!!errors.name}
                      errorMessage={errors.name}
                    />
                    <Input
                      label="ID"
                      placeholder="Enter unique identifier"
                      value={formData.id}
                      onValueChange={(value) => handleInputChange('id', value)}
                      isRequired
                      isDisabled={!!editingGroup} // Can't change ID of existing group
                      isInvalid={!!errors.id}
                      errorMessage={errors.id}
                      description="Auto-generated from name for new groups"
                    />
                  </div>
                  
                  <div>
                    <IconSelector 
                      selectedIcon={formData.icon} 
                      onSelectIcon={handleIconSelect} 
                    />
                  </div>
                  
                  <Textarea
                    label="Description"
                    placeholder="Enter product group description"
                    value={formData.description}
                    onValueChange={(value) => handleInputChange('description', value)}
                    isRequired
                    isInvalid={!!errors.description}
                    errorMessage={errors.description}
                    minRows={3}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" color="danger" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleSubmit}>
                  {editingGroup ? "Update Group" : "Add Group"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};