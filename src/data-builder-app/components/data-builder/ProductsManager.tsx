import React, { useMemo, useCallback } from "react";
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
  Checkbox,
  Divider,
  addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useDataBuilderStore, Product } from "../../stores/useDataBuilderStore";
import { FileManager } from "./product-fields/FileManager";
import { ImageGalleryManager } from "./product-fields/ImageGalleryManager";
import { SpecificationManager } from "./product-fields/SpecificationManager";
import { OptionsManager } from "./product-fields/OptionsManager";
import { AssetGenerator } from "../../utils/assetGenerator";

interface ProductsManagerProps {
  stepperID?: number | null;
}

export const ProductsManager: React.FC<ProductsManagerProps> = ({ stepperID }) => {
  const {
    products,
    productRanges,
    productGroups,
    addProduct,
    updateProduct,
    removeProduct,
    linkProductToRange,
    unlinkProductFromRange,
    relationships,
    productData,
  } = useDataBuilderStore();

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
    options: undefined,
    active: true,
  });

  const [productOptions, setProductOptions] = React.useState<Record<string, Array<{ value: string; imageUrl?: string }>>>({});

  const [selectedRanges, setSelectedRanges] = React.useState<Set<string>>(new Set());
  const [selectedProducts, setSelectedProducts] = React.useState<Set<string>>(new Set());
  const [isSyncingDO, setIsSyncingDO] = React.useState(false);

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Get category and range info for current product
  const currentProductContext = useMemo(() => {
    if (!editingProduct) return null;

    const rangeId = Object.entries(relationships.rangeToProducts).find(([_, productIds]) => productIds.includes(editingProduct.id))?.[0];

    if (!rangeId) return null;

    const range = productRanges.find((r) => r.id === rangeId);
    if (!range) return null;

    const groupId = Object.entries(relationships.groupToRanges).find(([_, rangeIds]) => rangeIds.includes(rangeId))?.[0];

    if (!groupId) return null;

    const group = productGroups.find((g) => g.id === groupId);
    if (!group) return null;

    return {
      category: group.name,
      range: range.name,
      productCode: editingProduct.code,
    };
  }, [editingProduct, relationships, productRanges, productGroups]);

  const handleFetchAllProductAssets = useCallback(async () => {
    const confirmed = confirm(
      "This will fetch images and files from plugin folders for ALL products and update their data. This action cannot be undone. Continue?"
    );

    if (!confirmed) return;

    try {
      const result = await AssetGenerator.fetchAndUpdateAllProductAssets(
        productGroups,
        productRanges,
        products,
        relationships,
        updateProduct,
        stepperID
      );

      addToast({
        color: result.success ? "success" : result.updatedCount === 0 ? "warning" : "danger",
        title: result.message,
      });
    } catch (error) {
      console.error("Error fetching all product assets:", error);

      addToast({
        color: "danger",
        title: "Error fetching assets. Please check console for details.",
      });
    }
  }, [updateProduct]);

  const handleAddProduct = useCallback(() => {
    setEditingProduct(null);
    setFormData({
      code: "",
      name: "",
      overview: "",
      description: "",
      specifications: [],
      imageGallery: [],
      files: {},
      options: undefined,
      active: true,
    });
    setProductOptions({});
    setSelectedRanges(new Set());
    setErrors({});
    onOpen();
  }, [onOpen]);

  const handleEditProduct = useCallback(
    (product: Product) => {
      setEditingProduct(product);
      setFormData({
        code: product.code,
        name: product.name,
        overview: product.overview,
        description: product.description,
        specifications: [...product.specifications],
        imageGallery: [...product.imageGallery],
        files: { ...product.files },
        options: product.options,
        active: product.active,
      });

      // Load product-specific options
      setProductOptions(product.options || {});

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
    },
    [relationships.rangeToProducts, onOpen]
  );

  const handleDeleteProduct = useCallback(
    (productId: string) => {
      if (confirm("Are you sure you want to delete this product?")) {
        removeProduct(productId);
      }
    },
    [removeProduct]
  );

  const handleInputChange = useCallback(
    (field: keyof Omit<Product, "id">, value: string | string[] | Record<string, string>) => {
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
    },
    [formData.code, errors]
  );

  const validateForm = useCallback(() => {
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
  }, [formData, products, editingProduct, selectedRanges]);

  const handleSubmit = useCallback(() => {
    if (!validateForm()) {
      return;
    }

    if (editingProduct) {
      // Update existing product
      updateProduct(editingProduct.id, {
        ...formData,
        options: Object.keys(productOptions).length > 0 ? productOptions : undefined,
      });

      // Update range relationships
      const currentRanges = new Set(
        Object.entries(relationships.rangeToProducts)
          .filter(([_, productIds]) => productIds.includes(editingProduct.id))
          .map(([rangeId, _]) => rangeId)
      );

      // Remove from ranges no longer selected
      currentRanges.forEach((rangeId) => {
        if (!selectedRanges.has(rangeId)) {
          unlinkProductFromRange(rangeId, editingProduct.id);
        }
      });

      // Add to newly selected ranges
      selectedRanges.forEach((rangeId) => {
        if (!currentRanges.has(rangeId)) {
          linkProductToRange(rangeId, editingProduct.id);
        }
      });
    } else {
      // Add new product
      const newProductData = {
        ...formData,
        options: Object.keys(productOptions).length > 0 ? productOptions : undefined,
      };

      addProduct(newProductData);

      // Link to selected ranges
      const productId = generateId(formData.code);
      selectedRanges.forEach((rangeId) => {
        linkProductToRange(rangeId, productId);
      });
    }

    onClose();
  }, [
    validateForm,
    editingProduct,
    updateProduct,
    formData,
    productOptions,
    relationships.rangeToProducts,
    unlinkProductFromRange,
    addProduct,
    selectedRanges,
    linkProductToRange,
    onClose,
  ]);

  // Helper function
  const generateId = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  // Get products grouped by their parent ranges
  const getGroupedProducts = useCallback(() => {
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
  }, [products, relationships.rangeToProducts, productRanges]);

  const handleToggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllProducts = useCallback(() => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    }
  }, [products, selectedProducts.size]);

  const handleSyncWithDigitalOcean = useCallback(async () => {
    if (selectedProducts.size === 0) {
      addToast({
        color: "warning",
        title: "No products selected",
        description: "Please select at least one product to sync",
      });
      return;
    }

    const confirmed = confirm(
      `This will fetch and update assets from Digital Ocean for ${selectedProducts.size} selected product(s). Continue?`
    );

    if (!confirmed) return;

    setIsSyncingDO(true);

    try {
      // Get product codes from selected IDs
      const selectedProductsArray = products.filter((p) => selectedProducts.has(p.id));
      const selectedProductCodes = selectedProductsArray.map((p) => p.code);

      // Fetch filtered Digital Ocean assets for selected products
      const result = await AssetGenerator.fetchDigitalOceanAssetsForProducts(
        selectedProductCodes,
        productGroups,
        productRanges,
        products,
        relationships
      );

      if (result.success) {
        // Update only the selected products with fetched data
        const updatedProducts = AssetGenerator.updateProductPathsFromDigitalOcean(
          selectedProductsArray,
          result.structured_data,
          productGroups,
          productRanges,
          relationships
        );

        let updatedCount = 0;
        let notFoundCount = 0;

        updatedProducts.forEach((updatedProduct) => {
          const originalProduct = products.find((p) => p.id === updatedProduct.id);

          if (originalProduct) {
            const hasChanges =
              JSON.stringify(originalProduct.imageGallery) !== JSON.stringify(updatedProduct.imageGallery) ||
              JSON.stringify(originalProduct.files) !== JSON.stringify(updatedProduct.files) ||
              JSON.stringify(originalProduct.options) !== JSON.stringify(updatedProduct.options);

            if (hasChanges) {
              updateProduct(updatedProduct.id, {
                imageGallery: updatedProduct.imageGallery,
                files: updatedProduct.files,
                options: updatedProduct.options,
              });
              updatedCount++;
            }
          }
        });

        // Check for products that weren't found in Digital Ocean
        notFoundCount =
          selectedProducts.size - updatedProducts.filter((p) => p.imageGallery.length > 0 || Object.keys(p.files).length > 0).length;

        if (updatedCount > 0) {
          addToast({
            color: "success",
            title: "Digital Ocean sync completed!",
            description: `Updated ${updatedCount} out of ${selectedProducts.size} selected products${
              notFoundCount > 0 ? `. ${notFoundCount} products had no assets found` : ""
            }`,
          });
        } else if (notFoundCount === selectedProducts.size) {
          addToast({
            color: "warning",
            title: "No assets found",
            description: "No assets were found in Digital Ocean for the selected products",
          });
        } else {
          addToast({
            color: "secondary",
            title: "No updates needed",
            description: "Selected products already have the latest assets",
          });
        }

        // Clear selection after sync
        setSelectedProducts(new Set());
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error syncing with Digital Ocean:", error);
      addToast({
        color: "danger",
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsSyncingDO(false);
    }
  }, [selectedProducts, products, productGroups, productRanges, relationships, updateProduct]);

  const { grouped, ungrouped } = getGroupedProducts();

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold">Products</h3>
          <p className="text-sm text-foreground-500">Manage individual products with detailed specifications</p>
        </div>
        <div className="flex gap-2">
          {/* <Button
            color="secondary"
            variant="flat"
            onPress={handleFetchAllProductAssets}
            startContent={<Icon icon="lucide:refresh-cw" width={18} />}
            isDisabled={products.length === 0}
          >
            Refetch All Assets
          </Button> */}

          {products.length > 0 && (
            <Button
              color="default"
              variant="flat"
              size="sm"
              onPress={handleSelectAllProducts}
              startContent={<Icon icon={selectedProducts.size === products.length ? "lucide:square-check" : "lucide:square"} width={16} />}
            >
              {selectedProducts.size === products.length ? "Deselect All" : "Select All"}
            </Button>
          )}
          {selectedProducts.size > 0 && (
            <Button
              color="secondary"
              variant="flat"
              onPress={handleSyncWithDigitalOcean}
              isLoading={isSyncingDO}
              startContent={!isSyncingDO ? <Icon icon="lucide:cloud-download" width={18} /> : undefined}
            >
              {isSyncingDO ? "Syncing..." : `Sync DO (${selectedProducts.size})`}
            </Button>
          )}
          <Button
            color="primary"
            onPress={handleAddProduct}
            startContent={<Icon icon="lucide:plus" width={18} />}
            isDisabled={productRanges.length === 0}
          >
            Add Product
          </Button>
        </div>
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
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    isSelected={selectedProducts.has(product.id)}
                    onToggleSelect={handleToggleProductSelection}
                  />
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
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    isSelected={selectedProducts.has(product.id)}
                    onToggleSelect={handleToggleProductSelection}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="4xl"
        scrollBehavior="inside"
        className="urbana-modal"
      >
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
                          classNames={{ input: "urbana-input" }}
                        />

                        <Input
                          label="Product Name"
                          placeholder="Enter product name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          errorMessage={errors.name}
                          isInvalid={!!errors.name}
                          isRequired
                          classNames={{ input: "urbana-input" }}
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
                        classNames={{ input: "urbana-input" }}
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
                        classNames={{ input: "urbana-input" }}
                      />
                    </div>
                  </Tab>

                  <Tab key="specifications" title="Specifications">
                    <SpecificationManager
                      specifications={formData.specifications}
                      onSpecificationsChange={(specs) => handleInputChange("specifications", specs)}
                    />
                  </Tab>

                  <Tab key="images" title="Images">
                    <ImageGalleryManager
                      imageGallery={formData.imageGallery}
                      onImageGalleryChange={(images) => handleInputChange("imageGallery", images)}
                      productCode={currentProductContext?.productCode || formData.code}
                      category={currentProductContext?.category}
                      range={currentProductContext?.range}
                    />
                  </Tab>

                  <Tab key="files" title="Files">
                    <FileManager
                      files={formData.files}
                      onFilesChange={(files) => handleInputChange("files", files)}
                      productCode={currentProductContext?.productCode || formData.code}
                      category={currentProductContext?.category}
                      range={currentProductContext?.range}
                    />
                  </Tab>

                  <Tab
                    key="options"
                    title={
                      <div className="flex items-center gap-2">
                        <span>Options</span>
                        {Object.keys(productOptions).length > 0 && (
                          <Chip size="sm" variant="flat">
                            {Object.keys(productOptions).length}
                          </Chip>
                        )}
                      </div>
                    }
                  >
                    <OptionsManager options={productOptions} onOptionsChange={setProductOptions} />
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
  isSelected: boolean;
  onToggleSelect: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onEdit, onDelete, isSelected, onToggleSelect }) => {
  const { updateProduct } = useDataBuilderStore();
  const hasImages = product.imageGallery.length > 0 && product.imageGallery[0];

  const handleToggleActive = () => {
    updateProduct(product.id, { active: typeof product.active === "undefined" ? false : !product.active });
  };
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start w-full">
          <div className="flex items-center gap-3 flex-1">
            <Checkbox isSelected={isSelected} onValueChange={() => onToggleSelect(product.id)} size="sm" />
            {hasImages ? (
              <Image src={product.imageGallery[0]} alt={product.name} width={40} height={40} className="rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                <Icon icon="lucide:package" width={20} className="text-success-600" />
              </div>
            )}
            <div>
              <h4 className="text-lg font-semibold">{product.name}</h4>
              {typeof product.active !== "undefined" && !product.active && (
                <Chip size="sm" variant="flat" color="warning">
                  Inactive
                </Chip>
              )}
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
                key="toggle-active"
                startContent={
                  <Icon icon={typeof product.active !== "undefined" && !product.active ? "lucide:eye" : "lucide:eye-off"} width={16} />
                }
                onPress={handleToggleActive}
              >
                {typeof product.active !== "undefined" && !product.active ? "Activate" : "Deactivate"}
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
});

ProductCard.displayName = "ProductCard";
