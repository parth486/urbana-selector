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
  Select,
  SelectItem,
  Tabs,
  Tab,
  Image,
  Divider,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataBuilderStore, Product } from "../../stores/useDataBuilderStore";

interface FileManagerProps {
  files: Record<string, string>;
  onFilesChange: (files: Record<string, string>) => void;
}

const FileManager: React.FC<FileManagerProps> = ({ files, onFilesChange }) => {
  const [fileName, setFileName] = React.useState("");
  const [fileUrl, setFileUrl] = React.useState("");

  const handleAddFile = () => {
    if (fileName.trim() && fileUrl.trim()) {
      onFilesChange({
        ...files,
        [fileName.trim()]: fileUrl.trim(),
      });
      setFileName("");
      setFileUrl("");
    }
  };

  const handleRemoveFile = (key: string) => {
    const newFiles = { ...files };
    delete newFiles[key];
    onFilesChange(newFiles);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="File name" value={fileName} onChange={(e) => setFileName(e.target.value)} size="sm" />
        <Input placeholder="File URL" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} size="sm" />
        <Button size="sm" color="primary" onPress={handleAddFile} isDisabled={!fileName.trim() || !fileUrl.trim()}>
          Add
        </Button>
      </div>

      {Object.entries(files).length > 0 && (
        <div className="space-y-2">
          {Object.entries(files).map(([name, url]) => (
            <div key={name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <div>
                <span className="font-medium text-sm">{name}</span>
                <span className="text-xs text-gray-500 ml-2">{url}</span>
              </div>
              <Button size="sm" variant="light" color="danger" onPress={() => handleRemoveFile(name)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface SpecificationManagerProps {
  specifications: string[];
  onSpecificationsChange: (specs: string[]) => void;
}

const SpecificationManager: React.FC<SpecificationManagerProps> = ({ specifications, onSpecificationsChange }) => {
  const [inputValue, setInputValue] = React.useState("");

  const handleAddSpec = () => {
    if (inputValue.trim() && !specifications.includes(inputValue.trim())) {
      onSpecificationsChange([...specifications, inputValue.trim()]);
      setInputValue("");
    }
  };

  const handleRemoveSpec = (spec: string) => {
    onSpecificationsChange(specifications.filter((s) => s !== spec));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Add specification"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAddSpec()}
          size="sm"
        />
        <Button size="sm" color="primary" onPress={handleAddSpec} isDisabled={!inputValue.trim()}>
          Add
        </Button>
      </div>

      {specifications.length > 0 && (
        <div className="space-y-2">
          {specifications.map((spec, index) => (
            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm">{spec}</span>
              <Button size="sm" variant="light" color="danger" onPress={() => handleRemoveSpec(spec)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ProductsManagerZustand: React.FC = () => {
  const { products, productRanges, addProduct, updateProduct, removeProduct, linkProductToRange, unlinkProductFromRange, relationships } =
    useDataBuilderStore();

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [formData, setFormData] = React.useState<Omit<Product, "id">>({
    code: "",
    name: "",
    overview: "",
    description: "",
    specifications: [],
    imageGallery: [],
    files: {},
  });
  const [selectedRanges, setSelectedRanges] = React.useState<Set<string>>(new Set());
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      code: "",
      name: "",
      overview: "",
      description: "",
      specifications: [],
      imageGallery: [],
      files: {},
    });
    setSelectedRanges(new Set());
    setErrors({});
    onOpen();
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      overview: product.overview,
      description: product.description,
      specifications: [...product.specifications],
      imageGallery: [...product.imageGallery],
      files: { ...product.files },
    });

    // Find which ranges this product belongs to
    const linkedRanges = new Set<string>();
    Object.entries(relationships.rangeToProducts).forEach(([rangeId, productIds]) => {
      if (productIds.includes(product.id)) {
        linkedRanges.add(rangeId);
      }
    });
    setSelectedRanges(linkedRanges);

    setErrors({});
    onOpen();
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      removeProduct(productId);
    }
  };

  const handleInputChange = (field: keyof Omit<Product, "id">, value: string | string[] | Record<string, string>) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Generate code from name if it's empty
    if (field === "name" && !formData.code && typeof value === "string") {
      const generatedCode = value
        .toUpperCase()
        .replace(/\s+/g, "-")
        .replace(/[^A-Z0-9-]/g, "");
      setFormData((prev) => ({ ...prev, code: generatedCode }));
    }

    // Clear error when field is edited
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = "Product code is required";
    }

    // Check for duplicate codes (excluding current product when editing)
    const isDuplicateCode = products.some(
      (product) => product.code.toLowerCase() === formData.code.toLowerCase() && (!editingProduct || product.id !== editingProduct.id)
    );

    if (isDuplicateCode) {
      newErrors.code = "A product with this code already exists";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }

    if (!formData.overview.trim()) {
      newErrors.overview = "Product overview is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Product description is required";
    }

    if (selectedRanges.size === 0) {
      newErrors.ranges = "Please select at least one product range";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    let productId: string;

    if (editingProduct) {
      // Update existing product
      updateProduct(editingProduct.id, formData);
      productId = editingProduct.id;

      // Update range relationships - remove from all ranges first
      Object.keys(relationships.rangeToProducts).forEach((rangeId) => {
        unlinkProductFromRange(rangeId, editingProduct.id);
      });
    } else {
      // Add new product
      addProduct(formData);
      // Generate the same ID that the store will use
      productId = (formData.code || formData.name)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }

    // Link to selected ranges
    selectedRanges.forEach((rangeId) => {
      linkProductToRange(rangeId, productId);
    });

    onClose();
  };

  // Get products grouped by their parent ranges
  const getGroupedProducts = () => {
    const grouped: Record<string, Product[]> = {};
    const ungrouped: Product[] = [];

    products.forEach((product) => {
      let hasRange = false;
      Object.entries(relationships.rangeToProducts).forEach(([rangeId, productIds]) => {
        if (productIds.includes(product.id)) {
          const range = productRanges.find((r) => r.id === rangeId);
          if (range) {
            if (!grouped[range.name]) grouped[range.name] = [];
            grouped[range.name].push(product);
            hasRange = true;
          }
        }
      });

      if (!hasRange) {
        ungrouped.push(product);
      }
    });

    return { grouped, ungrouped };
  };

  const { grouped, ungrouped } = getGroupedProducts();

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold">Products</h3>
          <p className="text-sm text-foreground-500">Manage individual products with detailed specifications</p>
        </div>
        <Button
          color="primary"
          onPress={handleAddProduct}
          startContent={<Icon icon="lucide:plus" width={18} />}
          isDisabled={productRanges.length === 0}
        >
          Add Product
        </Button>
      </div>

      {productRanges.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Icon icon="lucide:alert-circle" width={48} className="text-warning-500" />
              <div>
                <h3 className="text-lg font-semibold text-foreground-600">No Product Ranges Available</h3>
                <p className="text-sm text-foreground-500">You need to create product ranges first before adding products</p>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Icon icon="lucide:package" width={48} className="text-foreground-300" />
              <div>
                <h3 className="text-lg font-semibold text-foreground-600">No Products Yet</h3>
                <p className="text-sm text-foreground-500">Create your first product to get started</p>
              </div>
              <Button color="primary" onPress={handleAddProduct} startContent={<Icon icon="lucide:plus" width={18} />}>
                Add Product
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Grouped Products */}
          {Object.entries(grouped).map(([rangeName, products]) => (
            <div key={rangeName}>
              <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Icon icon="lucide:grid-3x3" width={18} />
                {rangeName}
                <Chip size="sm" variant="flat">
                  {products.length} product{products.length !== 1 ? "s" : ""}
                </Chip>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
                ))}
              </div>
            </div>
          ))}

          {/* Ungrouped Products */}
          {ungrouped.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-3 flex items-center gap-2 text-warning-600">
                <Icon icon="lucide:alert-triangle" width={18} />
                Ungrouped Products
                <Chip size="sm" variant="flat" color="warning">
                  {ungrouped.length} product{ungrouped.length !== 1 ? "s" : ""}
                </Chip>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ungrouped.map((product) => (
                  <ProductCard key={product.id} product={product} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{editingProduct ? "Edit Product" : "Add Product"}</ModalHeader>
              <ModalBody>
                <Tabs aria-label="Product Details" defaultSelectedKey="basic">
                  <Tab key="basic" title="Basic Info">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Product Code"
                          placeholder="e.g., SH-PEN-001"
                          value={formData.code}
                          onChange={(e) => handleInputChange("code", e.target.value)}
                          errorMessage={errors.code}
                          isInvalid={!!errors.code}
                          isRequired
                        />

                        <Input
                          label="Product Name"
                          placeholder="Enter product name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          errorMessage={errors.name}
                          isInvalid={!!errors.name}
                          isRequired
                        />
                      </div>

                      <Select
                        label="Product Ranges"
                        placeholder="Select product ranges"
                        selectionMode="multiple"
                        selectedKeys={selectedRanges}
                        onSelectionChange={(keys) => setSelectedRanges(keys as Set<string>)}
                        errorMessage={errors.ranges}
                        isInvalid={!!errors.ranges}
                        isRequired
                      >
                        {productRanges.map((range) => (
                          <SelectItem key={range.id}>{range.name}</SelectItem>
                        ))}
                      </Select>

                      <Textarea
                        label="Overview"
                        placeholder="Brief product overview"
                        value={formData.overview}
                        onChange={(e) => handleInputChange("overview", e.target.value)}
                        errorMessage={errors.overview}
                        isInvalid={!!errors.overview}
                        isRequired
                        rows={2}
                      />

                      <Textarea
                        label="Description"
                        placeholder="Detailed product description"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        errorMessage={errors.description}
                        isInvalid={!!errors.description}
                        isRequired
                        rows={4}
                      />
                    </div>
                  </Tab>

                  <Tab key="specifications" title="Specifications">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground-700 mb-2 block">Product Specifications</label>
                        <SpecificationManager
                          specifications={formData.specifications}
                          onSpecificationsChange={(specs) => handleInputChange("specifications", specs)}
                        />
                      </div>
                    </div>
                  </Tab>

                  <Tab key="files" title="Files & Images">
                    <div className="space-y-6">
                      <div>
                        <label className="text-sm font-medium text-foreground-700 mb-2 block">Image Gallery (URLs)</label>
                        <div className="space-y-2">
                          {formData.imageGallery.map((url, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                placeholder="Image URL"
                                value={url}
                                onChange={(e) => {
                                  const newGallery = [...formData.imageGallery];
                                  newGallery[index] = e.target.value;
                                  handleInputChange("imageGallery", newGallery);
                                }}
                                size="sm"
                              />
                              <Button
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => {
                                  const newGallery = formData.imageGallery.filter((_, i) => i !== index);
                                  handleInputChange("imageGallery", newGallery);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="flat"
                            onPress={() => handleInputChange("imageGallery", [...formData.imageGallery, ""])}
                          >
                            Add Image
                          </Button>
                        </div>
                      </div>

                      <Divider />

                      <div>
                        <label className="text-sm font-medium text-foreground-700 mb-2 block">Product Files</label>
                        <FileManager files={formData.files} onFilesChange={(files) => handleInputChange("files", files)} />
                      </div>
                    </div>
                  </Tab>
                </Tabs>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleSubmit}>
                  {editingProduct ? "Update" : "Add"} Product
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete }) => {
  const hasImages = product.imageGallery.length > 0 && product.imageGallery[0];

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start w-full">
          <div className="flex items-center gap-3">
            {hasImages ? (
              <Image src={product.imageGallery[0]} alt={product.name} width={40} height={40} className="rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                <Icon icon="lucide:package" width={20} className="text-success-600" />
              </div>
            )}
            <div>
              <h4 className="text-lg font-semibold">{product.name}</h4>
              <Chip size="sm" variant="flat" color="success">
                {product.code}
              </Chip>
            </div>
          </div>
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm">
                <Icon icon="lucide:more-vertical" width={16} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Product Actions">
              <DropdownItem key="edit" startContent={<Icon icon="lucide:edit" width={16} />} onPress={() => onEdit(product)}>
                Edit
              </DropdownItem>
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                startContent={<Icon icon="lucide:trash" width={16} />}
                onPress={() => onDelete(product.id)}
              >
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <p className="text-sm text-foreground-600 mb-2">{product.overview}</p>
        {product.specifications.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground-700">Specifications:</p>
            <div className="text-xs text-foreground-500">
              {product.specifications.slice(0, 3).map((spec, index) => (
                <div key={index}>• {spec}</div>
              ))}
              {product.specifications.length > 3 && <div>... and {product.specifications.length - 3} more</div>}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
