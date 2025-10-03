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
    return segment
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters except spaces and hyphens
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .trim();
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

      if (!rangeId) return product;

      const range = productRanges.find((r) => r.id === rangeId);
      if (!range) return product;

      const groupId = Object.entries(relationships.groupToRanges).find(([_, rangeIds]) => rangeIds.includes(rangeId))?.[0];

      if (!groupId) return product;

      const group = productGroups.find((g) => g.id === groupId);
      if (!group) return product;

      // Look for matching data in structured data
      const categoryName = group.name.toLowerCase();
      const rangeName = range.name.toLowerCase().replace(/\s+/g, "-");
      const productCode = product.code.toLowerCase();

      const productData = structuredData[categoryName]?.[rangeName]?.[productCode];

      if (!productData) return product;

      // Update image gallery
      const updatedImageGallery = productData.images.map((img) => img.url);

      // Update files
      const updatedFiles: Record<string, string> = {};
      productData.downloads.forEach((file) => {
        const displayName = AssetGenerator.generateFileDisplayNameFromFilename(file.filename);
        updatedFiles[displayName] = file.url;
      });

      return {
        ...product,
        imageGallery: updatedImageGallery.length > 0 ? updatedImageGallery : product.imageGallery,
        files: Object.keys(updatedFiles).length > 0 ? updatedFiles : product.files,
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
}
