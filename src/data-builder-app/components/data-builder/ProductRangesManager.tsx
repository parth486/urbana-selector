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
  Image,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { TagInput } from "./TagInput";

interface ProductRange {
  id: string;
  name: string;
  image: string;
  description: string;
  tags: string[];
}

interface ProductRangesManagerProps {
  ranges: ProductRange[];
  onRangesChange: (ranges: ProductRange[]) => void;
}

export const ProductRangesManager: React.FC<ProductRangesManagerProps> = ({ 
  ranges, 
  onRangesChange 
}) => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [editingRange, setEditingRange] = React.useState<ProductRange | null>(null);
  const [formData, setFormData] = React.useState<ProductRange>({
    id: '',
    name: '',
    image: '',
    description: '',
    tags: []
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleAddRange = () => {
    setEditingRange(null);
    setFormData({
      id: '',
      name: '',
      image: '',
      description: '',
      tags: []
    });
    setErrors({});
    onOpen();
  };

  const handleEditRange = (range: ProductRange) => {
    setEditingRange(range);
    setFormData({ ...range });
    setErrors({});
    onOpen();
  };

  const handleDeleteRange = (rangeId: string) => {
    if (confirm("Are you sure you want to delete this product range?")) {
      onRangesChange(ranges.filter(range => range.id !== rangeId));
    }
  };

  const handleInputChange = (field: keyof ProductRange, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Generate ID from name if it's a new range
    if (field === 'name' && !editingRange) {
      const generatedId = value.toLowerCase().replace(/\s+/g, '-');
      setFormData(prev => ({ ...prev, id: generatedId }));
    }
    
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTagsChange = (tags: string[]) => {
    setFormData(prev => ({ ...prev, tags }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!formData.id.trim()) {
      newErrors.id = "ID is required";
    } else if (
      !editingRange && 
      ranges.some(range => range.id === formData.id)
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
    
    if (editingRange) {
      // Update existing range
      onRangesChange(
        ranges.map(range => 
          range.id === editingRange.id ? formData : range
        )
      );
    } else {
      // Add new range
      onRangesChange([...ranges, formData]);
    }
    
    onClose();
  };

  // Memoize the generateRandomImage function to prevent unnecessary re-renders
  const generateRandomImage = React.useCallback((category: string) => {
    const categories = ["landscape", "places", "furniture"];
    const selectedCategory = categories.includes(category) ? category : "places";
    const randomId = Math.floor(Math.random() * 1000);
    
    return `https://img.heroui.chat/image/${selectedCategory}?w=400&h=300&u=range_${randomId}`;
  }, []);

  // Store generated images in a ref to prevent regeneration on every render
  const imageCache = React.useRef<Record<string, string>>({});

  // Get or create a cached image URL
  const getCachedImage = React.useCallback((rangeId: string, category: string = "places") => {
    if (!imageCache.current[rangeId]) {
      imageCache.current[rangeId] = generateRandomImage(category);
    }
    return imageCache.current[rangeId];
  }, [generateRandomImage]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Product Ranges</h3>
        <Button 
          color="primary" 
          onPress={handleAddRange}
          startContent={<Icon icon="lucide:plus" width={18} />}
        >
          Add Product Range
        </Button>
      </div>
      
      <Card>
        <CardBody className="p-0">
          <Table removeWrapper aria-label="Product Ranges Table">
            <TableHeader>
              <TableColumn>IMAGE</TableColumn>
              <TableColumn>NAME</TableColumn>
              <TableColumn>DESCRIPTION</TableColumn>
              <TableColumn>TAGS</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No product ranges added yet.">
              {ranges.map((range) => (
                <TableRow key={range.id}>
                  <TableCell>
                    <div className="w-16 h-12 rounded-medium overflow-hidden">
                      <Image
                        removeWrapper
                        alt={range.name}
                        className="w-full h-full object-cover"
                        src={range.image || getCachedImage(range.id, "places")}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{range.name}</p>
                      <p className="text-xs text-default-500">ID: {range.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="line-clamp-2">{range.description}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {range.tags.slice(0, 3).map((tag) => (
                        <Chip key={tag} size="sm" variant="flat">{tag}</Chip>
                      ))}
                      {range.tags.length > 3 && (
                        <Chip size="sm" variant="flat">+{range.tags.length - 3}</Chip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="flat" 
                        color="primary"
                        onPress={() => handleEditRange(range)}
                        startContent={<Icon icon="lucide:edit" width={16} />}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="flat" 
                        color="danger"
                        onPress={() => handleDeleteRange(range.id)}
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
                {editingRange ? "Edit Product Range" : "Add Product Range"}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Name"
                      placeholder="Enter product range name"
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
                      isDisabled={!!editingRange} // Can't change ID of existing range
                      isInvalid={!!errors.id}
                      errorMessage={errors.id}
                      description="Auto-generated from name for new ranges"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Image URL"
                        placeholder="Enter image URL or leave blank for random image"
                        value={formData.image}
                        onValueChange={(value) => handleInputChange('image', value)}
                        description="Optional - A random image will be used if left blank"
                      />
                      <div className="flex justify-end mt-2">
                        <Button 
                          size="sm" 
                          variant="flat" 
                          color="primary"
                          onPress={() => {
                            const newImage = generateRandomImage("places");
                            handleInputChange('image', newImage);
                            // If this is a new range, store the generated image
                            if (!editingRange && formData.id) {
                              imageCache.current[formData.id] = newImage;
                            }
                          }}
                        >
                          Generate Random Image
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2">
                        <span className="text-sm font-medium">Preview</span>
                      </div>
                      <div className="w-full h-32 rounded-medium overflow-hidden border border-default-200">
                        <Image
                          removeWrapper
                          alt="Range image preview"
                          className="w-full h-full object-cover"
                          src={formData.image || (editingRange ? getCachedImage(editingRange.id) : generateRandomImage("places"))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Textarea
                    label="Description"
                    placeholder="Enter product range description"
                    value={formData.description}
                    onValueChange={(value) => handleInputChange('description', value)}
                    isRequired
                    isInvalid={!!errors.description}
                    errorMessage={errors.description}
                    minRows={3}
                  />
                  
                  <div>
                    <TagInput 
                      label="Tags"
                      tags={formData.tags} 
                      onTagsChange={handleTagsChange} 
                      placeholder="Add tags and press Enter"
                      description="Add tags to categorize this product range"
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" color="danger" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleSubmit}>
                  {editingRange ? "Update Range" : "Add Range"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};