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
  Tabs,
  Tab
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { ProductSpecifications } from "./product-fields/ProductSpecifications";
import { ProductImages } from "./product-fields/ProductImages";
import { ProductFiles } from "./product-fields/ProductFiles";

interface Product {
  id: string;
  code: string;
  name: string;
  overview: string;
  description: string;
  specifications: string[];
  imageGallery: string[];
  files: Record<string, string>;
}

interface ProductsManagerProps {
  products: Product[];
  onProductsChange: (products: Product[]) => void;
}

export const ProductsManager: React.FC<ProductsManagerProps> = ({ 
  products, 
  onProductsChange 
}) => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [formData, setFormData] = React.useState<Product>({
    id: '',
    code: '',
    name: '',
    overview: '',
    description: '',
    specifications: [],
    imageGallery: [],
    files: {}
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      id: '',
      code: '',
      name: '',
      overview: '',
      description: '',
      specifications: [],
      imageGallery: [],
      files: {}
    });
    setErrors({});
    onOpen();
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setErrors({});
    onOpen();
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      onProductsChange(products.filter(product => product.id !== productId));
    }
  };

  const handleInputChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Generate ID from code if it's a new product
    if (field === 'code' && !editingProduct) {
      const generatedId = value.toLowerCase();
      setFormData(prev => ({ ...prev, id: generatedId }));
    }
    
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.code.trim()) {
      newErrors.code = "Product code is required";
    }
    
    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }
    
    if (!formData.overview.trim()) {
      newErrors.overview = "Overview is required";
    }
    
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    if (editingProduct) {
      // Update existing product
      onProductsChange(
        products.map(product => 
          product.id === editingProduct.id ? formData : product
        )
      );
    } else {
      // Add new product
      onProductsChange([...products, formData]);
    }
    
    onClose();
  };

  const getMainImage = (product: Product): string => {
    if (product.imageGallery && product.imageGallery.length > 0) {
      return `https://img.heroui.chat/image/${product.imageGallery[0]}?w=400&h=300&u=${product.code}_main`;
    }
    
    // Default image based on first letter of product code
    const firstChar = product.code.charAt(0).toUpperCase();
    
    const categoryMap: Record<string, string> = {
      'K': 'landscape', // Peninsula shelters
      'W': 'landscape', // Whyalla shelters
      'E': 'places',    // EcoSan toilets
      'S': 'places',    // Standard toilets
      'R': 'places',    // Ramps
      'B': 'furniture', // Benches
    };
    
    const category = categoryMap[firstChar] || 'places';
    return `https://img.heroui.chat/image/${category}?w=400&h=300&u=${product.code}_default`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Products</h3>
        <Button 
          color="primary" 
          onPress={handleAddProduct}
          startContent={<Icon icon="lucide:plus" width={18} />}
        >
          Add Product
        </Button>
      </div>
      
      <Card>
        <CardBody className="p-0">
          <Table removeWrapper aria-label="Products Table">
            <TableHeader>
              <TableColumn>IMAGE</TableColumn>
              <TableColumn>CODE & NAME</TableColumn>
              <TableColumn>OVERVIEW</TableColumn>
              <TableColumn>DETAILS</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No products added yet.">
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="w-16 h-12 rounded-medium overflow-hidden">
                      <Image
                        removeWrapper
                        alt={product.name}
                        className="w-full h-full object-cover"
                        src={getMainImage(product)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-default-500">Code: {product.code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="line-clamp-2">{product.overview}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Icon icon="lucide:image" width={14} className="text-default-500" />
                        <span className="text-xs">{product.imageGallery.length}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icon icon="lucide:file" width={14} className="text-default-500" />
                        <span className="text-xs">{Object.keys(product.files).length}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icon icon="lucide:list" width={14} className="text-default-500" />
                        <span className="text-xs">{product.specifications.length}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="flat" 
                        color="primary"
                        onPress={() => handleEditProduct(product)}
                        startContent={<Icon icon="lucide:edit" width={16} />}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="flat" 
                        color="danger"
                        onPress={() => handleDeleteProduct(product.id)}
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
      
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {editingProduct ? `Edit Product: ${editingProduct.code}` : "Add New Product"}
              </ModalHeader>
              <ModalBody>
                <Tabs aria-label="Product Details Tabs">
                  <Tab key="basic" title="Basic Information">
                    <div className="space-y-4 py-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Product Code"
                          placeholder="Enter product code (e.g., K301)"
                          value={formData.code}
                          onValueChange={(value) => handleInputChange('code', value)}
                          isRequired
                          isDisabled={!!editingProduct} // Can't change code of existing product
                          isInvalid={!!errors.code}
                          errorMessage={errors.code}
                        />
                        <Input
                          label="Product Name"
                          placeholder="Enter product name"
                          value={formData.name}
                          onValueChange={(value) => handleInputChange('name', value)}
                          isRequired
                          isInvalid={!!errors.name}
                          errorMessage={errors.name}
                        />
                      </div>
                      
                      <Textarea
                        label="Overview"
                        placeholder="Enter a brief overview of the product"
                        value={formData.overview}
                        onValueChange={(value) => handleInputChange('overview', value)}
                        isRequired
                        isInvalid={!!errors.overview}
                        errorMessage={errors.overview}
                        minRows={2}
                      />
                      
                      <Textarea
                        label="Description"
                        placeholder="Enter detailed product description"
                        value={formData.description}
                        onValueChange={(value) => handleInputChange('description', value)}
                        isRequired
                        isInvalid={!!errors.description}
                        errorMessage={errors.description}
                        minRows={4}
                      />
                    </div>
                  </Tab>
                  
                  <Tab key="specifications" title="Specifications">
                    <ProductSpecifications 
                      specifications={formData.specifications}
                      onChange={(specs) => handleInputChange('specifications', specs)}
                    />
                  </Tab>
                  
                  <Tab key="images" title="Images">
                    <ProductImages 
                      productCode={formData.code}
                      imageGallery={formData.imageGallery}
                      onChange={(images) => handleInputChange('imageGallery', images)}
                    />
                  </Tab>
                  
                  <Tab key="files" title="Files">
                    <ProductFiles 
                      files={formData.files}
                      onChange={(files) => handleInputChange('files', files)}
                    />
                  </Tab>
                </Tabs>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" color="danger" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleSubmit}>
                  {editingProduct ? "Update Product" : "Add Product"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};