import { Product, ProductRange, ProductGroup, Relationships } from "../stores/useDataBuilderStore";

export interface AssetStructure {
  category: string;
  range: string;
  productCode: string;
  paths: {
    imagesPath: string;
    downloadsPath: string;
    fullImagePath: string;
    fullDownloadPath: string;
  };
}

export interface GenerationResult {
  success: boolean;
  message: string;
  created: string[];
  errors?: string[];
  already_exists?: string[];
  debug_info?: {
    plugin_path: string;
    total_structures: number;
  };
}

export interface DigitalOceanResult {
  success: boolean;
  message: string;
  total_folders: number;
  total_objects: number;
  raw_folders: string[];
  raw_objects: DigitalOceanObject[];
  structured_data: StructuredData;
  debug_info: {
    prefix: string;
    configuration: DigitalOceanConfig;
    categories: string[];
  };
}

export interface DigitalOceanObject {
  key: string;
  size: number;
  last_modified: string;
  url: string;
}

export interface StructuredData {
  [category: string]: {
    [range: string]: {
      [productCode: string]: {
        images: FileInfo[];
        downloads: FileInfo[];
        img_conf?: {
          [optionGroup: string]: {
            [optionValue: string]: FileInfo;
          };
        };
      };
    };
  };
}

export interface FileInfo {
  filename: string;
  url: string;
  size: number;
  modified: string;
}

export interface DigitalOceanConfig {
  bucket_name: string;
  region: string;
  endpoint: string;
  configured: boolean;
}

export class AssetGenerator {
  private static baseAssetsPath = "assets/products";

  static generateAssetStructure(
    productGroups: ProductGroup[],
    productRanges: ProductRange[],
    products: Product[],
    relationships: Relationships
  ): AssetStructure[] {
    const structures: AssetStructure[] = [];

    // Iterate through all products
    products.forEach((product) => {
      // Find which range this product belongs to
      const rangeId = Object.entries(relationships.rangeToProducts).find(([_, productIds]) => productIds.includes(product.id))?.[0];

      if (!rangeId) return;

      const range = productRanges.find((r) => r.id === rangeId);
      if (!range) return;

      // Find which group this range belongs to
      const groupId = Object.entries(relationships.groupToRanges).find(([_, rangeIds]) => rangeIds.includes(rangeId))?.[0];

      if (!groupId) return;

      const group = productGroups.find((g) => g.id === groupId);
      if (!group) return;

      const category = this.sanitizePathSegment(group.name);
      const rangeName = this.sanitizePathSegment(range.name);
      const productCode = this.sanitizePathSegment(product.code);

      const structure: AssetStructure = {
        category: group.name.toLowerCase(),
        range: range.name.toLowerCase().replace(/\s+/g, "-"),
        productCode: product.code.toLowerCase(),
        paths: {
          imagesPath: `${this.baseAssetsPath}/${category}/${rangeName}/${productCode}/images`,
          downloadsPath: `${this.baseAssetsPath}/${category}/${rangeName}/${productCode}/downloads`,
          fullImagePath: `/wp-content/plugins/urbana/${this.baseAssetsPath}/${category}/${rangeName}/${productCode}/images`,
          fullDownloadPath: `/wp-content/plugins/urbana/${this.baseAssetsPath}/${category}/${rangeName}/${productCode}/downloads`,
        },
      };

      structures.push(structure);
    });

    return structures;
  }

  private static sanitizePathSegment(segment: string): string {
    // Replace special characters with spaces (keeping alphanumeric, spaces, hyphens, underscores)
    let cleaned = segment.replace(/[^a-zA-Z0-9\s\-_]/g, ' ');
    // Replace multiple spaces with single space
    cleaned = cleaned.replace(/\s+/g, ' ');
    // Convert to lowercase for case-insensitive handling
    return cleaned.toLowerCase().trim();
  }

  static async generateFoldersAPI(structures: AssetStructure[]): Promise<GenerationResult> {
    try {
      const response = await fetch("/wp-json/urbana/v1/generate-asset-folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
        },
        body: JSON.stringify({
          structures: structures.map((s) => ({
            category: s.category,
            range: s.range,
            productCode: s.productCode,
            imagesPath: s.paths.imagesPath,
            downloadsPath: s.paths.downloadsPath,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate folders: ${response.status} ${response.statusText}`);
      }

      const result: GenerationResult = await response.json();
      return result;
    } catch (error) {
      console.error("Error generating folders:", error);
      throw error;
    }
  }

  static async debugPaths(): Promise<any> {
    try {
      const response = await fetch("/wp-json/urbana/v1/debug-paths", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get debug info: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting debug info:", error);
      throw error;
    }
  }

  static generateFolderPreview(structures: AssetStructure[]): string[] {
    const folders: string[] = [];

    structures.forEach((structure) => {
      folders.push(structure.paths.imagesPath);
      folders.push(structure.paths.downloadsPath);
    });

    // Remove duplicates and sort
    return [...new Set(folders)].sort();
  }

  static updateProductPaths(products: Product[], structures: AssetStructure[]): Product[] {
    return products.map((product) => {
      const structure = structures.find((s) => s.productCode === product.code.toLowerCase());

      if (!structure) return product;

      // Update image gallery paths if they're placeholder or empty
      const updatedImageGallery =
        product.imageGallery.length > 0
          ? product.imageGallery.map((img, index) => {
              // If it's a placeholder path, update it
              if (!img || img.includes("shelter/") || img.includes("toilet/") || img.includes("bridge/") || img.includes("access/")) {
                return `${structure.paths.imagesPath}/image-${index + 1}.jpg`;
              }
              return img;
            })
          : [`${structure.paths.imagesPath}/hero-image.jpg`];

      // Update file paths
      const updatedFiles: Record<string, string> = {};
      Object.entries(product.files).forEach(([name, path]) => {
        // If it's a filename without path, add the proper path
        if (!path.includes("/")) {
          updatedFiles[name] = `${structure.paths.downloadsPath}/${path}`;
        } else {
          updatedFiles[name] = path;
        }
      });

      return {
        ...product,
        imageGallery: updatedImageGallery,
        files: updatedFiles,
      };
    });
  }

  static async fetchAndUpdateAllProductAssets(
    productGroups: ProductGroup[],
    productRanges: ProductRange[],
    products: Product[],
    relationships: Relationships,
    updateProductCallback: (productId: string, updates: Partial<Product>) => void,
    stepperID?: number
  ): Promise<{ success: boolean; updatedCount: number; message: string }> {
    const assetStructures = this.generateAssetStructure(productGroups, productRanges, products, relationships);

    if (assetStructures.length === 0) {
      return {
        success: false,
        updatedCount: 0,
        message: "No products found with proper group/range relationships.",
      };
    }

    try {
      const response = await fetch("/wp-json/urbana/v1/fetch-all-product-assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
        },
        body: JSON.stringify({ stepperID: stepperID || 1 }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch assets: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        let updatedCount = 0;

        Object.entries(result.productAssets).forEach(([productCode, assets]: [string, any]) => {
          const product = products.find((p) => p.code === productCode);
          if (product) {
            updateProductCallback(product.id, {
              imageGallery: assets.images || [],
              files: assets.files || {},
            });
            updatedCount++;
          } else {
            console.warn("Product not found for code:", productCode);
          }
        });

        return {
          success: true,
          updatedCount,
          message: `Successfully updated ${updatedCount} products with their assets.`,
        };
      } else {
        return {
          success: false,
          updatedCount: 0,
          message: "Failed to fetch assets: " + result.message,
        };
      }
    } catch (error) {
      console.error("Error fetching all product assets:", error);
      throw error;
    }
  }

  static async testDigitalOceanConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch("/wp-json/urbana/v1/digital-ocean/test-connection", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
        },
      });

      if (!response.ok) {
        throw new Error(`Connection test failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error testing Digital Ocean connection:", error);
      throw error;
    }
  }

  static async fetchDigitalOceanAssets(prefix: string = ""): Promise<DigitalOceanResult> {
    try {
      const response = await fetch("/wp-json/urbana/v1/digital-ocean/fetch-assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
        },
        body: JSON.stringify({ prefix }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch assets: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching Digital Ocean assets:", error);
      throw error;
    }
  }

  /**
   * Fetch Digital Ocean assets for selected products by building appropriate prefix
   * then filtering results client-side
   */
  static async fetchDigitalOceanAssetsForProducts(
    productCodes: string[],
    productGroups: ProductGroup[],
    productRanges: ProductRange[],
    products: Product[],
    relationships: Relationships
  ): Promise<DigitalOceanResult> {
    try {
      // Determine the common prefix for all selected products
      // This helps reduce the data fetched from Digital Ocean
      const prefixes: string[] = [];

      productCodes.forEach((code) => {
        const product = products.find((p) => p.code.toLowerCase() === code.toLowerCase());
        if (!product) return;

        // Find range for this product
        const rangeId = Object.entries(relationships.rangeToProducts).find(([_, productIds]) => productIds.includes(product.id))?.[0];
        if (!rangeId) return;

        const range = productRanges.find((r) => r.id === rangeId);
        if (!range) return;

        // Find group for this range
        const groupId = Object.entries(relationships.groupToRanges).find(([_, rangeIds]) => rangeIds.includes(rangeId))?.[0];
        if (!groupId) return;

        const group = productGroups.find((g) => g.id === groupId);
        if (!group) return;

        // Build prefix: category/range/product_code
        const category = this.sanitizePathSegment(group.name);
        const rangeName = this.sanitizePathSegment(range.name);
        const productCode = this.sanitizePathSegment(product.code);

        prefixes.push(`${category}/${rangeName}/${productCode}`);
      });

      if (prefixes.length === 0) {
        throw new Error("No valid products found to sync");
      }

      // Find the most common prefix to minimize data transfer
      // For now, we'll use the shortest common prefix or fetch all if they're too different
      const commonPrefix = this.findCommonPrefix(prefixes);

      // Fetch all assets with the common prefix
      const result = await this.fetchDigitalOceanAssets("");

      if (!result.success) {
        return result;
      }

      // Filter structured data to only include selected products
      const filteredStructuredData = this.filterStructuredDataByProducts(
        result.structured_data,
        productCodes,
        productGroups,
        productRanges,
        products,
        relationships
      );

      // Return filtered result
      return {
        ...result,
        structured_data: filteredStructuredData,
      };
    } catch (error) {
      console.error("Error fetching Digital Ocean assets for products:", error);
      throw error;
    }
  }

  /**
   * Find the most specific common prefix for a set of paths
   */
  private static findCommonPrefix(prefixes: string[]): string {
    if (prefixes.length === 0) return "";
    if (prefixes.length === 1) return prefixes[0];

    // Split all prefixes into parts
    const allParts = prefixes.map((p) => p.split("/"));

    // Find common parts from the beginning
    const commonParts: string[] = [];
    const minLength = Math.min(...allParts.map((p) => p.length));

    for (let i = 0; i < minLength; i++) {
      const part = allParts[0][i];
      if (allParts.every((parts) => parts[i] === part)) {
        commonParts.push(part);
      } else {
        break;
      }
    }

    // Return common prefix, or empty string if no common parts
    return commonParts.length > 0 ? commonParts.join("/") + "/" : "";
  }

  /**
   * Filter structured data to only include specified product codes
   */
  private static filterStructuredDataByProducts(
    structuredData: StructuredData,
    productCodes: string[],
    productGroups: ProductGroup[],
    productRanges: ProductRange[],
    products: Product[],
    relationships: Relationships
  ): StructuredData {
    const filtered: StructuredData = {};

    // Build a map of product codes to their expected structure
    const productPaths = new Map<
      string,
      {
        category: string;
        range: string;
        productCode: string;
      }
    >();

    productCodes.forEach((code) => {
      const product = products.find((p) => p.code.toLowerCase() === code.toLowerCase());
      if (!product) return;

      const rangeId = Object.entries(relationships.rangeToProducts).find(([_, productIds]) => productIds.includes(product.id))?.[0];
      if (!rangeId) return;

      const range = productRanges.find((r) => r.id === rangeId);
      if (!range) return;

      const groupId = Object.entries(relationships.groupToRanges).find(([_, rangeIds]) => rangeIds.includes(rangeId))?.[0];
      if (!groupId) return;

      const group = productGroups.find((g) => g.id === groupId);
      if (!group) return;

      productPaths.set(code.toLowerCase(), {
        category: group.name,
        range: range.name,
        productCode: code,
      });
    });

    // Filter structured data
    Object.entries(structuredData).forEach(([categoryKey, categoryData]) => {
      Object.entries(categoryData).forEach(([rangeKey, rangeData]) => {
        Object.entries(rangeData).forEach(([productKey, productData]) => {
          // Check if this product is in our selected list
          const normalizedProductCode = productKey.toLowerCase();

          // Find matching product path
          for (const [code, path] of productPaths.entries()) {
            if (code === normalizedProductCode) {
              // Verify category and range match (case-insensitive)
              const categoryMatch =
                categoryKey.toLowerCase().includes(path.category.toLowerCase()) ||
                path.category.toLowerCase().includes(categoryKey.toLowerCase());

              const rangeMatch = rangeKey.toLowerCase().replace(/[\s-_]/g, "") === path.range.toLowerCase().replace(/[\s-_]/g, "");

              if (categoryMatch && rangeMatch) {
                // Initialize structure if needed
                if (!filtered[categoryKey]) {
                  filtered[categoryKey] = {};
                }
                if (!filtered[categoryKey][rangeKey]) {
                  filtered[categoryKey][rangeKey] = {};
                }

                // Add this product's data
                filtered[categoryKey][rangeKey][productKey] = productData;
              }
              break;
            }
          }
        });
      });
    });

    return filtered;
  }

  static async getDigitalOceanConfig(): Promise<DigitalOceanConfig> {
    try {
      const response = await fetch("/wp-json/urbana/v1/digital-ocean/config", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get config: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting Digital Ocean config:", error);
      throw error;
    }
  }

  static updateProductPathsFromDigitalOcean(
    products: Product[],
    structuredData: StructuredData,
    productGroups: ProductGroup[],
    productRanges: ProductRange[],
    relationships: Relationships
  ): Product[] {
    return products.map((product) => {
      // Find the category and range for this product
      const rangeId = Object.entries(relationships.rangeToProducts).find(([_, productIds]) => productIds.includes(product.id))?.[0];

      if (!rangeId) {
        console.warn(`No range found for product: ${product.code}`);
        return product;
      }

      const range = productRanges.find((r) => r.id === rangeId);
      if (!range) {
        console.warn(`Range not found for rangeId: ${rangeId}`);
        return product;
      }

      const groupId = Object.entries(relationships.groupToRanges).find(([_, rangeIds]) => rangeIds.includes(rangeId))?.[0];

      if (!groupId) {
        console.warn(`No group found for range: ${range.name}`);
        return product;
      }

      const group = productGroups.find((g) => g.id === groupId);
      if (!group) {
        console.warn(`Group not found for groupId: ${groupId}`);
        return product;
      }

      // Try to find matching data in structured data
      let productData = null;
      let foundCategory = null;
      let foundRange = null;

      // Search through all categories (case-insensitive)
      for (const [categoryKey, categoryData] of Object.entries(structuredData)) {
        if (typeof categoryData === "object" && !Array.isArray(categoryData)) {
          // Check if this category matches our group
          if (
            categoryKey.toLowerCase().includes(group.name.toLowerCase()) ||
            group.name.toLowerCase().includes(categoryKey.toLowerCase())
          ) {
            // Search through ranges in this category
            for (const [rangeKey, rangeData] of Object.entries(categoryData)) {
              if (typeof rangeData === "object" && !Array.isArray(rangeData)) {
                // Check if this range matches
                const rangeMatch = rangeKey.toLowerCase().replace(/[\s-_]/g, "") === range.name.toLowerCase().replace(/[\s-_]/g, "");

                if (rangeMatch) {
                  // Search for product code (case-insensitive)
                  for (const [productKey, pData] of Object.entries(rangeData)) {
                    if (productKey.toLowerCase() === product.code.toLowerCase()) {
                      productData = pData;
                      foundCategory = categoryKey;
                      foundRange = rangeKey;
                      break;
                    }
                  }
                }
              }

              if (productData) break;
            }
          }
        }

        if (productData) break;
      }

      if (!productData) {
        console.warn(`No Digital Ocean data found for product: ${product.code} (Group: ${group.name}, Range: ${range.name})`);
        return product;
      }

      console.log(`Found match for ${product.code}:`, {
        category: foundCategory,
        range: foundRange,
        images: productData.images.length,
        downloads: productData.downloads.length,
        optionGroups: productData.img_conf ? Object.keys(productData.img_conf).length : 0,
      });

      // Update image gallery - preserve all images
      const updatedImageGallery = productData.images.map((img) => img.url);

      // Update files
      const updatedFiles: Record<string, string> = {};
      productData.downloads.forEach((file) => {
        const displayName = this.generateFileDisplayNameFromFilename(file.filename);
        updatedFiles[displayName] = file.url;
      });

      // Build product-specific options from img_conf
      const productOptions: Record<string, Array<{ value: string; imageUrl: string }>> = {};

      if (productData.img_conf) {
        Object.entries(productData.img_conf).forEach(([optionGroup, optionValues]) => {
          productOptions[optionGroup] = Object.entries(optionValues).map(([optionValue, fileInfo]) => ({
            value: optionValue,
            imageUrl: fileInfo.url,
          }));

          // Sort options by value for consistency
          productOptions[optionGroup].sort((a, b) => a.value.localeCompare(b.value));
        });
      }

      return {
        ...product,
        imageGallery: updatedImageGallery.length > 0 ? updatedImageGallery : product.imageGallery,
        files: Object.keys(updatedFiles).length > 0 ? updatedFiles : product.files,
        options: Object.keys(productOptions).length > 0 ? productOptions : product.options,
      };
    });
  }

  private static generateFileDisplayNameFromFilename(filename: string): string {
    const name = filename.replace(/\.[^/.]+$/, ""); // Remove extension
    const extension = filename.split(".").pop()?.toLowerCase() || "";

    // Convert filename to a more readable format
    const displayName = name
      .replace(/[_-]/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Add context based on extension
    switch (extension) {
      case "pdf":
        if (/spec/i.test(name)) return "PDF Specification";
        if (/install/i.test(name)) return "Installation Guide";
        if (/manual/i.test(name)) return "User Manual";
        return `${displayName} (PDF)`;
      case "dwg":
        return "CAD Drawing";
      case "rvt":
        return "Revit Model";
      case "doc":
      case "docx":
        return `${displayName} (Document)`;
      default:
        return displayName;
    }
  }

  // Add this new method to the AssetGenerator class
  static buildCompleteStructureFromDigitalOcean(structuredData: StructuredData): {
    productGroups: ProductGroup[];
    productRanges: ProductRange[];
    products: Product[];
    relationships: Relationships;
  } {
    const productGroups: ProductGroup[] = [];
    const productRanges: ProductRange[] = [];
    const products: Product[] = [];
    const relationships: Relationships = {
      groupToRanges: {},
      rangeToProducts: {},
    };

    // Iterate through categories (product groups)
    Object.entries(structuredData).forEach(([categoryName, categoryData]) => {
      const groupId = this.sanitizePathSegment(categoryName);

      productGroups.push({
        id: groupId,
        name: categoryName,
        icon: this.getDefaultIconForGroup(categoryName),
        description: this.getDescriptionForGroup(categoryName),
      });

      relationships.groupToRanges[groupId] = [];

      // Iterate through ranges within category
      Object.entries(categoryData).forEach(([rangeName, rangeData]) => {
        const rangeId = this.sanitizePathSegment(rangeName);

        productRanges.push({
          id: rangeId,
          name: rangeName,
          image: "",
          description: this.getDescriptionForRange(rangeName),
          tags: this.getTagsForRange(rangeName),
        });

        relationships.groupToRanges[groupId].push(rangeId);
        relationships.rangeToProducts[rangeId] = [];

        // Iterate through products within range
        Object.entries(rangeData).forEach(([productCode, productData]) => {
          const productId = this.sanitizePathSegment(productCode);

          // Build product-specific options from img_conf
          const productOptions: Record<string, Array<{ value: string; imageUrl: string }>> = {};

          if (productData.img_conf) {
            Object.entries(productData.img_conf).forEach(([optionGroup, optionValues]) => {
              productOptions[optionGroup] = Object.entries(optionValues).map(([optionValue, fileInfo]) => ({
                value: optionValue,
                imageUrl: fileInfo.url,
              }));
            });
          }

          products.push({
            id: productId,
            code: productCode,
            name: this.generateProductName(productCode),
            overview: `Overview for ${productCode}`,
            description: `Detailed description for ${productCode}`,
            specifications: [],
            imageGallery: productData.images.map((img) => img.url),
            files: productData.downloads.reduce((acc, file) => {
              const displayName = this.generateFileDisplayNameFromFilename(file.filename);
              acc[displayName] = file.url;
              return acc;
            }, {} as Record<string, string>),
            options: Object.keys(productOptions).length > 0 ? productOptions : undefined,
          });

          relationships.rangeToProducts[rangeId].push(productId);
        });
      });
    });

    return {
      productGroups,
      productRanges,
      products,
      relationships,
    };
  }

  // Helper methods
  private static getDefaultIconForGroup(groupName: string): string {
    const name = groupName.toLowerCase();
    if (name.includes("shelter")) return "lucide:home";
    if (name.includes("toilet")) return "lucide:door-open";
    if (name.includes("access")) return "lucide:key";
    if (name.includes("config")) return "lucide:settings";
    return "lucide:package";
  }

  private static getDescriptionForGroup(groupName: string): string {
    return `${groupName} product category`;
  }

  private static getDescriptionForRange(rangeName: string): string {
    return `${rangeName} product range`;
  }

  private static getTagsForRange(rangeName: string): string[] {
    return [rangeName.toLowerCase()];
  }

  private static generateProductName(productCode: string): string {
    // Convert product code to a readable name
    // e.g., "k302" -> "K302"
    return productCode.toUpperCase();
  }
}
