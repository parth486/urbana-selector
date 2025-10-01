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
}
