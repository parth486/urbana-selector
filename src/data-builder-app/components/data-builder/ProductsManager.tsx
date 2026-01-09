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
import SecureImage from "./SecureImage";
import { FileManager } from "./product-fields/FileManager";
import { ImageGalleryManager } from "./product-fields/ImageGalleryManager";
import { CoreDesignElementManager, CoreDesignField } from "./product-fields/CoreDesignElementManager";
import { AssetGenerator } from "../../utils/assetGenerator";
import { DigitalOceanSyncPanel } from "./DigitalOceanSyncPanel";

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
    coreDesignElement: [],
    faqs: [],
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
        stepperID ?? undefined
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
      coreDesignElement: [],
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
        faqs: product.faqs || [],
        options: product.options,
        coreDesignElement: product.coreDesignElement || [],
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
    (
      field: keyof Omit<Product, "id">,
      value:
        | string
        | string[]
        | Record<string, string>
        | Array<{ question: string; answer: string }>
        | Array<{ id: string; label: string; type: "text" | "dropdown"; value?: string; values?: string[]; defaultValue?: string }>
    ) => {
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

  const handleRenameInDigitalOcean = async (oldCode: string, newCode: string, rangeName: string, groupName: string) => {
    try {
      const oldPath = `${groupName}/${rangeName}/${oldCode}`;
      const newPath = `${groupName}/${rangeName}/${newCode}`;
      
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

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    console.log('[ProductsManager] Form Data Before Submit:', formData);
    console.log('[ProductsManager] coreDesignElement:', formData.coreDesignElement);

    let needsRename = false;
    let oldProductCode: string | null = null;
    let rangeInfo: { rangeName: string; groupName: string } | null = null;

    if (editingProduct) {
      // Check if code has changed
      needsRename = editingProduct.code !== formData.code;
      oldProductCode = editingProduct.code;

      // Get range and group info for rename path
      if (needsRename) {
        const rangeId = Object.entries(relationships.rangeToProducts).find(([_, productIds]) => 
          productIds.includes(editingProduct.id)
        )?.[0];

        if (rangeId) {
          const range = productRanges.find(r => r.id === rangeId);
          if (range) {
            const groupId = Object.entries(relationships.groupToRanges).find(([_, rangeIds]) => 
              rangeIds.includes(rangeId)
            )?.[0];

            if (groupId) {
              const group = productGroups.find(g => g.id === groupId);
              if (group) {
                rangeInfo = {
                  rangeName: range.name,
                  groupName: group.name
                };
              }
            }
          }
        }
      }

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

    // Handle Digital Ocean rename if needed
    if (needsRename && oldProductCode && rangeInfo) {
      const shouldRename = confirm(
        `The product code has changed from "${oldProductCode}" to "${formData.code}".\n\n` +
        `Do you want to rename the folder in Digital Ocean as well?\n` +
        `This will move all contents from:\n` +
        `  ${rangeInfo.groupName}/${rangeInfo.rangeName}/${oldProductCode}/\n` +
        `to:\n` +
        `  ${rangeInfo.groupName}/${rangeInfo.rangeName}/${formData.code}/`
      );

      if (shouldRename) {
        try {
          await handleRenameInDigitalOcean(oldProductCode, formData.code, rangeInfo.rangeName, rangeInfo.groupName);
          alert(`✅ Successfully renamed folder in Digital Ocean from "${oldProductCode}" to "${formData.code}"`);
        } catch (error) {
          alert(`❌ Failed to rename folder in Digital Ocean. Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThe product has been updated in WordPress, but the Digital Ocean folder was not renamed.`);
        }
      }
    }

    onClose();
  }, [
    validateForm,
    editingProduct,
    updateProduct,
    formData,
    productOptions,
    relationships.rangeToProducts,
    relationships.groupToRanges,
    unlinkProductFromRange,
    addProduct,
    selectedRanges,
    linkProductToRange,
    productRanges,
    productGroups,
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

  // Digital Ocean Sync State - organized by ranges like the Manage Products tab
  const [syncItemsGrouped, setSyncItemsGrouped] = React.useState<{
    grouped: Record<string, Array<{
      id: string;
      name: string;
      type: 'product';
      exists?: boolean;
      checked?: boolean;
    }>>;
    ungrouped: Array<{
      id: string;
      name: string;
      type: 'product';
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
        body: JSON.stringify({ type: 'products' }),
      });

      if (response.ok) {
        const result = await response.json();
        // Debug log the API results
        console.log('[DO Sync] API /check-folders result:', result);
        if (result.success && result.results) {
          // Debug log the current sync items before update
          setSyncItemsGrouped(prev => {
            console.log('[DO Sync] Previous syncItemsGrouped:', prev);
            const newGrouped = { ...prev.grouped };
            const newUngrouped = [...prev.ungrouped];

            // Update grouped items
            Object.keys(newGrouped).forEach(rangeName => {
              newGrouped[rangeName] = newGrouped[rangeName].map(item => {
                const existenceData = result.results.find((r: any) => r.id === item.id);
                if (!existenceData) {
                  console.warn(`[DO Sync] No existence data for item id: ${item.id}`);
                } else {
                  console.log(`[DO Sync] Mapping item id: ${item.id}, exists:`, existenceData.exists);
                }
                return {
                  ...item,
                  exists: existenceData ? existenceData.exists : false
                };
              });
            });

            // Update ungrouped items
            newUngrouped.forEach((item, index) => {
              const existenceData = result.results.find((r: any) => r.id === item.id);
              if (existenceData) {
                console.log(`[DO Sync] Mapping ungrouped item id: ${item.id}, exists:`, existenceData.exists);
                newUngrouped[index] = { ...item, exists: existenceData.exists };
              } else {
                console.warn(`[DO Sync] No existence data for ungrouped item id: ${item.id}`);
              }
            });

            const updated = {
              grouped: newGrouped,
              ungrouped: newUngrouped
            };
            console.log('[DO Sync] Updated syncItemsGrouped:', updated);
            return updated;
          });
        }
      } else {
        console.error('[DO Sync] check-folders returned HTTP', response.status);
        setSyncItemsGrouped(prev => {
          const newGrouped = { ...prev.grouped };
          const newUngrouped = [...prev.ungrouped];

          Object.keys(newGrouped).forEach(rangeName => {
            newGrouped[rangeName] = newGrouped[rangeName].map(item => ({ ...item, exists: false }));
          });

          newUngrouped.forEach((item, index) => {
            newUngrouped[index] = { ...item, exists: false };
          });

          return { grouped: newGrouped, ungrouped: newUngrouped };
        });
      }
    } catch (error) {
      console.error('❌ Failed to check folder existence:', error);
    }
  }, []);

  React.useEffect(() => {
    // Initialize sync items from grouped products
    const { grouped, ungrouped } = getGroupedProducts();
    
    const syncGrouped: Record<string, Array<{
      id: string;
      name: string;
      type: 'product';
      exists?: boolean;
      checked?: boolean;
    }>> = {};

    // Process grouped products
    Object.entries(grouped).forEach(([rangeName, rangeProducts]) => {
      syncGrouped[rangeName] = rangeProducts.map(product => ({
        id: product.id,
        name: product.name || product.code,
        type: 'product' as const,
        exists: undefined as unknown as boolean | undefined,
        checked: false,
      }));
    });

    // Process ungrouped products
    const syncUngrouped = ungrouped.map(product => ({
      id: product.id,
      name: product.name || product.code,
      type: 'product' as const,
      exists: undefined as unknown as boolean | undefined,
      checked: false,
    }));

    setSyncItemsGrouped({
      grouped: syncGrouped,
      ungrouped: syncUngrouped
    });

    // Check folder existence after state is set
    checkFolderExistence();
  }, [products, relationships, productRanges]); // Removed checkFolderExistence from deps

  const handleItemCheck = (id: string, checked: boolean) => {
    setSyncItemsGrouped(prev => {
      const newGrouped = { ...prev.grouped };
      const newUngrouped = [...prev.ungrouped];

      // Check in grouped items
      Object.keys(newGrouped).forEach(rangeName => {
        newGrouped[rangeName] = newGrouped[rangeName].map(item => 
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
      Object.keys(newGrouped).forEach(rangeName => {
        newGrouped[rangeName] = newGrouped[rangeName].map(item => ({ ...item, checked }));
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
      const response = await fetch(`${apiUrl}digital-ocean/create-product-folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': (window as any).urbanaAdmin?.nonce || '',
        },
        body: JSON.stringify({ product_ids: selectedIds }),
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
        Object.keys(newGrouped).forEach(rangeName => {
          newGrouped[rangeName] = newGrouped[rangeName].map(item => 
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

      <Tabs aria-label="Products Options" className="mb-6">
        <Tab key="manage" title={
          <div className="flex items-center space-x-2">
            <Icon icon="lucide:package" width={16} />
            <span>Manage Products</span>
          </div>
        }>
          <div className="mt-4">
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
          {Object.entries(grouped).map(([rangeName, products]) => {
            // Find the range and its parent group
            const range = productRanges.find(r => r.name === rangeName);
            let groupName = null;
            let groupIcon = null;
            
            if (range) {
              const groupId = Object.entries(relationships.groupToRanges).find(([, rangeIds]) =>
                rangeIds.includes(range.id)
              )?.[0];
              const group = groupId ? productGroups.find(g => g.id === groupId) : null;
              if (group) {
                groupName = group.name;
                groupIcon = group.icon;
              }
            }

            return (
              <div key={rangeName}>
                {groupName && (
                  <div className="mb-2 flex items-center gap-2 text-primary">
                    {groupIcon && <Icon icon={groupIcon} width={16} />}
                    <span className="text-sm font-medium">{groupName}</span>
                  </div>
                )}
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
            );
          })}

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
          </div>
        </Tab>
        
        <Tab key="sync" title={
          <div className="flex items-center space-x-2">
            <Icon icon="lucide:cloud-upload" width={16} />
            <span>Digital Ocean Sync</span>
          </div>
        }>
          <div className="mt-4">
            {/* Custom Grouped Digital Ocean Sync Panel for Products */}
            <Card className="urbana-card">
              <CardHeader className="flex gap-3">
                <Icon icon="lucide:cloud-upload" width={24} />
                <div className="flex flex-col">
                  <p className="text-md font-semibold">Products - Digital Ocean Sync</p>
                  <p className="text-small text-default-500">
                    Organize by ranges like the Manage Products tab
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
                      Object.values(syncItemsGrouped.grouped).forEach(rangeProducts => {
                        rangeProducts.forEach(product => {
                          if (product.checked) selectedIds.push(product.id);
                        });
                      });
                      syncItemsGrouped.ungrouped.forEach(product => {
                        if (product.checked) selectedIds.push(product.id);
                      });
                      handleSync(selectedIds);
                    }}
                    isDisabled={(() => {
                      let hasSelected = false;
                      Object.values(syncItemsGrouped.grouped).forEach(rangeProducts => {
                        rangeProducts.forEach(product => {
                          if (product.checked) hasSelected = true;
                        });
                      });
                      syncItemsGrouped.ungrouped.forEach(product => {
                        if (product.checked) hasSelected = true;
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
                    <p>No products available to sync</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Grouped products with card layout */}
                    {Object.entries(syncItemsGrouped.grouped).map(([rangeName, rangeProducts]) => {
                      // Find the range to get its parent group
                      const range = productRanges.find(r => r.name === rangeName);
                      const groupId = range ? Object.entries(relationships.groupToRanges).find(([, rangeIds]) =>
                        rangeIds.includes(range.id)
                      )?.[0] : null;
                      const productGroup = groupId ? productGroups.find(g => g.id === groupId) : null;

                      return (
                        <div key={rangeName} className="space-y-3">
                          {/* Show group name and icon above range */}
                          {productGroup && (
                            <div className="flex items-center gap-2 mb-1">
                              <Icon icon={productGroup.icon} width={16} className="text-default-500" />
                              <span className="text-sm text-default-500">{productGroup.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Icon icon="lucide:grid-3x3" width={18} className="text-primary" />
                            <h4 className="font-semibold text-lg text-primary">{rangeName}</h4>
                            <Chip size="sm" variant="flat" color="primary">
                              {rangeProducts.length} product{rangeProducts.length !== 1 ? 's' : ''}
                            </Chip>
                          </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {rangeProducts.map((product) => {
                            const productData = products.find(p => p.id === product.id);

                            return (
                              <Card 
                                key={product.id} 
                                className={`hover:shadow-lg transition-all cursor-pointer border-2 ${
                                  product.checked 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-transparent hover:border-primary/30'
                                }`}
                                isPressable
                                onPress={() => handleItemCheck(product.id, !product.checked)}
                              >
                                <CardHeader className="pb-3">
                                  <div className="flex justify-between items-start w-full">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                                          <Icon icon="lucide:package" width={20} className="text-secondary-600" />
                                        </div>
                                        <div className="absolute -top-1 -right-1">
                                          <Checkbox
                                            isSelected={product.checked || false}
                                            onValueChange={(checked) => {
                                              handleItemCheck(product.id, checked);
                                            }}
                                            size="sm"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="text-md font-semibold">{product.name}</h4>
                                        {productData && (
                                          <p className="text-xs text-foreground-500">{productData.code}</p>
                                        )}
                                      </div>
                                    </div>
                                    <Chip
                                      size="sm"
                                      variant="flat"
                                      color={product.exists === true ? "success" : product.exists === false ? "warning" : "default"}
                                      startContent={
                                        product.exists === undefined ? (
                                          <Icon icon="lucide:loader-2" width={12} className="animate-spin" />
                                        ) : product.exists ? (
                                          <Icon icon="lucide:check-circle" width={14} />
                                        ) : (
                                          <Icon icon="lucide:alert-circle" width={14} />
                                        )
                                      }
                                    >
                                      {product.exists === undefined ? "Checking..." : product.exists ? "Exists" : "Missing"}
                                    </Chip>
                                  </div>
                                </CardHeader>
                                {productData && productData.overview && (
                                  <CardBody className="pt-0">
                                    <p className="text-sm text-foreground-600 line-clamp-2">{productData.overview}</p>
                                  </CardBody>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                      );
                    })}

                    {/* Ungrouped products with card layout */}
                    {syncItemsGrouped.ungrouped.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Icon icon="lucide:alert-triangle" width={18} className="text-warning" />
                          <h4 className="font-semibold text-lg text-warning">Ungrouped Products</h4>
                          <Chip size="sm" variant="flat" color="warning">
                            {syncItemsGrouped.ungrouped.length} product{syncItemsGrouped.ungrouped.length !== 1 ? 's' : ''}
                          </Chip>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {syncItemsGrouped.ungrouped.map((product) => {
                            const productData = products.find(p => p.id === product.id);

                            return (
                              <Card 
                                key={product.id} 
                                className={`hover:shadow-lg transition-all cursor-pointer border-2 ${
                                  product.checked 
                                    ? 'border-warning bg-warning/5' 
                                    : 'border-transparent hover:border-warning/30'
                                }`}
                                isPressable
                                onPress={() => handleItemCheck(product.id, !product.checked)}
                              >
                                <CardHeader className="pb-3">
                                  <div className="flex justify-between items-start w-full">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                                          <Icon icon="lucide:package" width={20} className="text-warning-600" />
                                        </div>
                                        <div className="absolute -top-1 -right-1">
                                          <Checkbox
                                            isSelected={product.checked || false}
                                            onValueChange={(checked) => {
                                              handleItemCheck(product.id, checked);
                                            }}
                                            size="sm"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="text-md font-semibold">{product.name}</h4>
                                        {productData && (
                                          <p className="text-xs text-foreground-500">{productData.code}</p>
                                        )}
                                      </div>
                                    </div>
                                    <Chip
                                      size="sm"
                                      variant="flat"
                                      color={product.exists === true ? "success" : product.exists === false ? "warning" : "default"}
                                      startContent={
                                        product.exists === undefined ? (
                                          <Icon icon="lucide:loader-2" width={12} className="animate-spin" />
                                        ) : product.exists ? (
                                          <Icon icon="lucide:check-circle" width={14} />
                                        ) : (
                                          <Icon icon="lucide:alert-circle" width={14} />
                                        )
                                      }
                                    >
                                      {product.exists === undefined ? "Checking..." : product.exists ? "Exists" : "Missing"}
                                    </Chip>
                                  </div>
                                </CardHeader>
                                {productData && productData.overview && (
                                  <CardBody className="pt-0">
                                    <p className="text-sm text-foreground-600 line-clamp-2">{productData.overview}</p>
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

                {/* Selected items summary */}
                {(() => {
                  const selectedCount = Object.values(syncItemsGrouped.grouped).reduce((count, rangeProducts) => {
                    return count + rangeProducts.filter(p => p.checked).length;
                  }, 0) + syncItemsGrouped.ungrouped.filter(p => p.checked).length;
                  
                  if (selectedCount === 0) return null;

                  return (
                    <div className="mt-4 bg-primary/10 rounded-lg p-3">
                      <p className="text-sm text-primary font-medium">
                        {selectedCount} product folder(s) will be created in Digital Ocean Spaces
                      </p>
                    </div>
                  );
                })()}
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>

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

                  <Tab key="coreDesignElement" title="Core Design Element">
                    <CoreDesignElementManager
                      fields={formData.coreDesignElement}
                      onFieldsChange={(fields) => handleInputChange("coreDesignElement", fields)}
                    />
                  </Tab>
                  <Tab key="faqs" title="FAQs">
                    <div className="space-y-4">
                      <p className="text-sm text-default-500">
                        Add frequently asked questions for this product. These will appear in the product details FAQ tab in the frontend.
                      </p>

                      {(formData.faqs || []).map((f, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                          <input
                            className="col-span-12 urbana-input"
                            placeholder={`Question ${idx + 1}`}
                            value={f.question}
                            onChange={(e) => {
                              const newFaqs = [...(formData.faqs || [])];
                              newFaqs[idx] = { ...newFaqs[idx], question: e.target.value };
                              handleInputChange("faqs", newFaqs);
                            }}
                          />
                          <textarea
                            className="col-span-12 urbana-input"
                            placeholder={`Answer ${idx + 1}`}
                            rows={3}
                            value={f.answer}
                            onChange={(e) => {
                              const newFaqs = [...(formData.faqs || [])];
                              newFaqs[idx] = { ...newFaqs[idx], answer: e.target.value };
                              handleInputChange("faqs", newFaqs);
                            }}
                          />
                          <div className="col-span-12 flex justify-end">
                            <Button variant="light" color="danger" onPress={() => {
                              const newFaqs = [...(formData.faqs || [])];
                              newFaqs.splice(idx, 1);
                              handleInputChange("faqs", newFaqs);
                            }}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}

                      <div>
                        <Button onPress={() => handleInputChange("faqs", [...(formData.faqs || []), { question: "", answer: "" }])}>
                          Add FAQ
                        </Button>
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
  isSelected: boolean;
  onToggleSelect: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onEdit, onDelete, isSelected, onToggleSelect }) => {
  const { updateProduct } = useDataBuilderStore();
  const hasImages = product.imageGallery.length > 0 && product.imageGallery[0] && product.imageGallery[0].trim() !== "";
  
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
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                <SecureImage 
                  imagePath={product.imageGallery[0]} 
                  productCode={product.code}
                  alt={product.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                <Icon icon="lucide:package" width={20} className="text-success-600" />
              </div>
            )}
            <div className="flex-1">
              <h4 className="text-lg font-semibold">{product.name}</h4>
              <div className="flex flex-wrap gap-1 mt-1">
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
