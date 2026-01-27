import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { productData } from "../../data/productData";

export interface ProductGroup {
  id: string;
  name: string;
  icon: string;
  description: string;
  active: boolean;
}

export interface ProductRange {
  id: string;
  name: string;
  image: string;
  description: string;
  tags: string[];
  active: boolean;
  groupName: string; // NEW: parent group name for backend
}

export interface Product {
  id: string;
  code: string;
  name: string;
  overview: string;
  description: string;
  specifications: string[];
  imageGallery: string[];
  files: Record<string, string>;
  options?: Record<string, Array<{ value: string; imageUrl?: string }>>; // Optional product-specific options
  coreDesignElement?: Array<{ id: string; label: string; type: "text" | "dropdown"; value?: string; values?: string[]; defaultValue?: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  active: boolean;
}

export interface ProductContent {
  name: string;
  overview: string;
  description: string;
  specifications: string[];
  imageGallery: string[];
  files: Record<string, string>;
  faqs?: Array<{ question: string; answer: string }>;
}

export interface Relationships {
  groupToRanges: Record<string, string[]>;
  rangeToProducts: Record<string, string[]>;
}

export interface ProductDataStructure {
  id?: number; // Add optional ID field
  stepperForm: {
    steps: Array<{
      step: number;
      title: string;
      categories?: string[];
      ranges?: Record<string, string[]>;
      products?: Record<string, string[]>;
      productDetails?: Record<string, ProductContent>;
      options?: Record<string, string[]>;
      fields?: Array<{
        name: string;
        label: string;
        type: string;
        required: boolean;
      }>;
      [key: string]: any;
    }>;
  };
}

interface DataBuilderState {
  // Core data
  productData: ProductDataStructure;
  productGroups: ProductGroup[];
  productRanges: ProductRange[];
  products: Product[];
  relationships: Relationships;

  // State flags
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  error: string | null;

  // Computed getters
  getRangesForGroup: (groupId: string) => ProductRange[];
  getProductsForRange: (rangeId: string) => Product[];
  getProductById: (productId: string) => Product | undefined;
  getGroupById: (groupId: string) => ProductGroup | undefined;
  getRangeById: (rangeId: string) => ProductRange | undefined;

  // Data management actions
  initializeFromWindowData: () => void;
  initializeFromProductData: (data: ProductDataStructure) => void;
  updateProductData: (data: ProductDataStructure) => void;
  exportData: () => ProductDataStructure;

  // Product Group actions
  addProductGroup: (group: Omit<ProductGroup, "id">) => void;
  updateProductGroup: (id: string, updates: Partial<ProductGroup>) => void;
  removeProductGroup: (id: string) => void;

  // Product Range actions
  addProductRange: (range: Omit<ProductRange, "id">) => void;
  updateProductRange: (id: string, updates: Partial<ProductRange>) => void;
  removeProductRange: (id: string) => void;

  // Product actions
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  removeProduct: (id: string) => void;

  // Relationship actions
  linkRangeToGroup: (groupId: string, rangeId: string) => void;
  unlinkRangeFromGroup: (groupId: string, rangeId: string) => void;
  linkProductToRange: (rangeId: string, productId: string) => void;
  unlinkProductFromRange: (rangeId: string, productId: string) => void;
  updateRelationships: (relationships: Relationships) => void;

  // Options and fields
  updateOptions: (options: Record<string, string[]>) => void;
  updateContactFields: (fields: any[]) => void;

  // Persistence actions - Fixed return types
  saveData: () => Promise<number | undefined>;
  loadData: (stepperId?: number) => Promise<void>;
  resetData: () => void;
  importData: (data: ProductDataStructure) => void;

  // Utility actions
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Helper functions
const generateId = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};

const getDefaultIconForGroup = (groupName: string): string => {
  const iconMap: Record<string, string> = {
    Shelter: "lucide:home",
    Toilet: "lucide:bath",
    Bridge: "lucide:route",
    Access: "lucide:wheelchair",
    Seating: "lucide:armchair",
    Lighting: "lucide:lamp",
  };

  return iconMap[groupName] || "lucide:box";
};

const getDescriptionForGroup = (groupName: string): string => {
  const descriptions: Record<string, string> = {
    Shelter: "Outdoor structures for shade and protection",
    Toilet: "Public and portable sanitation facilities",
    Bridge: "Pedestrian and light vehicle crossings",
    Access: "Ramps, stairs, and accessibility solutions",
    Seating: "Benches and outdoor furniture options",
    Lighting: "Outdoor and pathway lighting solutions",
  };

  return descriptions[groupName] || "Product category";
};

const getDescriptionForRange = (rangeName: string): string => {
  const descriptions: Record<string, string> = {
    // Shelter ranges
    Peninsula: "Modern shelters with excellent weather protection for parks and urban settings",
    Whyalla: "Robust shelters designed for coastal and high-wind environments",
    Coastal: "Corrosion-resistant designs perfect for beachfront and marine locations",
    Urban: "Contemporary designs that blend with modern city landscapes",
    Heritage: "Traditional designs that complement historic and cultural settings",

    // Toilet ranges
    EcoSan: "Environmentally friendly composting toilet solutions with minimal water usage",
    Standard: "Reliable and cost-effective public toilet facilities",
    Accessible: "Fully compliant accessible toilet facilities with enhanced features",
    Premium: "High-end toilet facilities with superior finishes and amenities",
    Compact: "Space-saving designs for areas with limited footprint",

    // Bridge ranges
    "Small Span": "Compact bridges for garden paths and small water crossings",
    "Large Span": "Extended bridges for wider crossings and heavier loads",
    Pedestrian: "Dedicated walkways designed for high foot traffic areas",
    Decorative: "Ornamental bridges that serve as landscape features",
    "Heavy Duty": "Reinforced bridges capable of supporting maintenance vehicles",
  };

  return descriptions[rangeName] || `${rangeName} product range`;
};

const getTagsForRange = (rangeName: string): string[] => {
  const allTags: Record<string, string[]> = {
    // Shelter ranges
    Peninsula: ["Modern", "Weather-resistant", "Versatile"],
    Whyalla: ["Robust", "Wind-resistant", "Durable"],
    Coastal: ["Corrosion-resistant", "Salt-proof", "UV-stable"],
    Urban: ["Contemporary", "Modular", "Space-efficient"],
    Heritage: ["Traditional", "Ornate", "Classic"],

    // Toilet ranges
    EcoSan: ["Eco-friendly", "Low-water", "Composting"],
    Standard: ["Cost-effective", "Reliable", "Low-maintenance"],
    Accessible: ["ADA Compliant", "Spacious", "Universal"],
    Premium: ["High-end", "Enhanced features", "Superior finishes"],
    Compact: ["Space-saving", "Efficient", "Urban-friendly"],

    // Bridge ranges
    "Small Span": ["Compact", "Decorative", "Easy-install"],
    "Large Span": ["Extended", "Reinforced", "Heavy-load"],
    Pedestrian: ["High-traffic", "Safety-focused", "Accessible"],
    Decorative: ["Ornamental", "Artistic", "Feature piece"],
    "Heavy Duty": ["Vehicle-rated", "Industrial", "Maximum strength"],

    // Default for other categories
    default: ["Quality", "Durable", "Customizable"],
  };

  return allTags[rangeName] || allTags["default"];
};

const initialProductData: ProductDataStructure = {
  id: 1, // Add default ID
  stepperForm: {
    steps: [
      {
        step: 1,
        title: "Select Product Group",
        categories: [],
      },
      {
        step: 2,
        title: "Select Product Range",
        ranges: {},
      },
      {
        step: 3,
        title: "Select Individual Product",
        products: {},
      },
      {
        step: 4,
        title: "View Product Content",
        productDetails: {},
      },
      {
        step: 5,
        title: "Configure Options",
        options: {},
      },
      {
        step: 6,
        title: "Contact Information",
        fields: [
          {
            name: "fullName",
            label: "Full Name",
            type: "text",
            required: true,
          },
          {
            name: "email",
            label: "Email Address",
            type: "email",
            required: true,
          },
          {
            name: "phone",
            label: "Phone Number",
            type: "tel",
            required: false,
          },
          {
            name: "company",
            label: "Company/Organization",
            type: "text",
            required: false,
          },
          {
            name: "message",
            label: "Additional Notes",
            type: "textarea",
            required: false,
          },
        ],
      },
    ],
  },
};

export const useDataBuilderStore = create<DataBuilderState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      productData: initialProductData,
      productGroups: [],
      productRanges: [],
      products: [],
      relationships: {
        groupToRanges: {},
        rangeToProducts: {},
      },
      isDirty: false,
      isSaving: false,
      isLoading: false,
      lastSaved: null,
      error: null,

      // Initialize from window data - Fixed implementation
      initializeFromWindowData: () => {
        const windowData = (window as any).urbanaAdmin;

        if (!windowData) {
          console.warn("No urbanaAdmin window data found");
          return;
        }

        // Always set the stepper form data structure first
        if (windowData.stepperFormData) {
          set((draft) => {
            draft.productData = windowData.stepperFormData;
          });
        }

        // Check if we have existing data builder data
        if (
          windowData.stepperDataBuilder &&
          typeof windowData.stepperDataBuilder === "object" &&
          windowData.stepperDataBuilder.productGroups &&
          windowData.stepperDataBuilder.productGroups.length > 0
        ) {
          // Use the existing data builder information - DON'T extract from stepper form
          set((draft) => {
            draft.productGroups = windowData.stepperDataBuilder.productGroups || [];
            draft.productRanges = windowData.stepperDataBuilder.productRanges || [];
            draft.products = windowData.stepperDataBuilder.products || [];
            draft.relationships = windowData.stepperDataBuilder.relationships || {
              groupToRanges: {},
              rangeToProducts: {},
            };

            if (windowData.stepperDataBuilder.lastSaved) {
              draft.lastSaved = new Date(windowData.stepperDataBuilder.lastSaved);
            }

            draft.isDirty = false;
          });
        } else {
          console.log("No existing data builder data found, extracting from stepper form data");
          // Only extract from stepper form if no data builder data exists
          if (windowData.stepperFormData && windowData.stepperFormData.stepperForm) {
            get().initializeFromProductData(windowData.stepperFormData);
          } else {
            get().initializeFromProductData(productData);
            console.warn("No stepper form data found in window.urbanaAdmin");
          }
        }
      },

      // Fixed loadData implementation
      loadData: async (stepperId?: number) => {
        if (!stepperId) {
          // Use data from window if no specific stepper ID requested
          get().initializeFromWindowData();
          return;
        }

        set((draft) => {
          draft.isLoading = true;
          draft.error = null;
        });

        try {
          const response = await fetch(`/wp-json/urbana/v1/data-builder/${stepperId}`, {
            method: "GET",
            headers: {
              "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();

          // Set stepper form data
          if (data.stepper_form_data) {
            set((draft) => {
              draft.productData = data.stepper_form_data;
            });
          }

          // Check if we have data builder data with actual content
          if (
            data.stepper_data_builder &&
            typeof data.stepper_data_builder === "object" &&
            data.stepper_data_builder.productGroups &&
            data.stepper_data_builder.productGroups.length > 0
          ) {
            console.log("Loading existing API data builder data:", data.stepper_data_builder);

            set((draft) => {
              draft.productGroups = data.stepper_data_builder.productGroups || [];
              draft.productRanges = data.stepper_data_builder.productRanges || [];
              draft.products = data.stepper_data_builder.products || [];
              draft.relationships = data.stepper_data_builder.relationships || {
                groupToRanges: {},
                rangeToProducts: {},
              };

              if (data.stepper_data_builder.lastSaved) {
                draft.lastSaved = new Date(data.stepper_data_builder.lastSaved);
              }
            });
          } else {
            console.log("No existing API data builder data found, extracting from stepper form data");
            // Extract from stepper form if no data builder data exists
            if (data.stepper_form_data) {
              get().initializeFromProductData(data.stepper_form_data);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          console.error("Error loading data:", errorMessage);
          set((draft) => {
            draft.error = errorMessage;
          });
          throw error;
        } finally {
          set((draft) => {
            draft.isLoading = false;
          });
        }
      },

      getRangesForGroup: (groupId: string) => {
        const { productRanges, relationships } = get();
        const rangeIds = relationships.groupToRanges[groupId] || [];
        return productRanges.filter((range) => rangeIds.includes(range.id));
      },

      getProductsForRange: (rangeId: string) => {
        const { products, relationships } = get();
        const productIds = relationships.rangeToProducts[rangeId] || [];
        return products.filter((product) => productIds.includes(product.id));
      },

      getProductById: (productId: string) => {
        const { products } = get();
        return products.find((product) => product.id === productId);
      },

      getGroupById: (groupId: string) => {
        const { productGroups } = get();
        return productGroups.find((group) => group.id === groupId);
      },

      getRangeById: (rangeId: string) => {
        const { productRanges } = get();
        return productRanges.find((range) => range.id === rangeId);
      },

      // Fixed saveData with proper return type
      saveData: async () => {
        set((draft) => {
          draft.isSaving = true;
          draft.error = null;
        });

        try {
          const exportedData = get().exportData();
          const { productGroups, productRanges, products, relationships } = get();

          console.log('[saveData] Products being saved:', products);
          products.forEach((p) => {
            console.log(`[saveData] Product ${p.code} coreDesignElement:`, p.coreDesignElement);
            if (p.coreDesignElement) {
              p.coreDesignElement.forEach((field) => {
                console.log(`  Field: ${field.label}, type: ${field.type}, defaultValue: ${field.defaultValue}, values: ${JSON.stringify(field.values)}`);
              });
            }
          });

          const response = await fetch("/wp-json/urbana/v1/product-data", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
            },
            body: JSON.stringify({
              stepper_form_data: exportedData,
              stepper_data_builder: {
                productGroups,
                productRanges,
                products,
                relationships,
                lastSaved: new Date().toISOString(),
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to save data: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();

          set((draft) => {
            draft.productData = exportedData;
            draft.isDirty = false;
            draft.lastSaved = new Date();
          });

          console.log("Data saved successfully, stepper ID:", result.stepper_id);
          return result.stepper_id;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          console.error("Error saving data:", errorMessage);
          set((draft) => {
            draft.error = errorMessage;
          });
          throw error;
        } finally {
          set((draft) => {
            draft.isSaving = false;
          });
        }
      },

      // ...rest of existing implementation remains the same...
      initializeFromProductData: (data: ProductDataStructure) =>
        set((draft) => {
          draft.productData = data;

          // Extract product groups
          const groups = (data.stepperForm.steps[0].categories || []).map((name: string) => ({
            id: generateId(name),
            name,
            icon: getDefaultIconForGroup(name),
            description: getDescriptionForGroup(name),
          }));
          draft.productGroups = groups;

          // Extract product ranges
          const ranges: ProductRange[] = [];
          Object.entries(data.stepperForm.steps[1].ranges || {}).forEach(([groupName, rangeNames]: [string, any]) => {
            rangeNames.forEach((name: string) => {
              ranges.push({
                id: generateId(name),
                name,
                image: "",
                description: getDescriptionForRange(name),
                tags: getTagsForRange(name),
                groupName: groupName, // MIGRATION: set groupName for all ranges
              });
            });
          });
          draft.productRanges = ranges;

          // Extract products - fix ungrouped products
          const productsList: Product[] = [];
          const productsStep = data.stepperForm.steps[2].products || {};
          
          // First pass: collect all products and identify those in proper ranges
          const productsInRanges = new Set<string>();
          Object.entries(productsStep).forEach(([rangeName, productCodes]: [string, any]) => {
            if (rangeName && rangeName !== '' && rangeName !== 'undefined') {
              (productCodes as string[]).forEach(code => {
                productsInRanges.add(code);
              });
            }
          });

          // Second pass: add all products, whether they're in ranges or ungrouped
          Object.entries(productsStep).forEach(([rangeName, productCodes]: [string, any]) => {
            (productCodes as string[]).forEach((code: string) => {
              const productDetails = data.stepperForm.steps[3].productDetails?.[code];
              productsList.push({
                id: generateId(code),
                code,
                name: productDetails?.name || `${code} Product`,
                overview: productDetails?.overview || "",
                description: productDetails?.description || "",
                specifications: productDetails?.specifications || [],
                imageGallery: productDetails?.imageGallery || [],
                files: productDetails?.files || {},
              });
            });
          });
          draft.products = productsList;

          // Extract relationships
          const groupToRanges: Record<string, string[]> = {};
          Object.entries(data.stepperForm.steps[1].ranges || {}).forEach(([groupName, rangeNames]: [string, any]) => {
            const groupId = generateId(groupName);
            groupToRanges[groupId] = (rangeNames as string[]).map((name) => generateId(name));
          });

          // Build rangeToProducts - map products back to ranges, fixing ungrouped products
          const rangeToProducts: Record<string, string[]> = {};
          Object.entries(productsStep).forEach(([rangeName, productCodes]: [string, any]) => {
            // Skip ungrouped keys
            if (!rangeName || rangeName === '' || rangeName === 'undefined') {
              // Try to find where ungrouped products actually belong
              (productCodes as string[]).forEach((code: string) => {
                // Search for this product code in other ranges
                let found = false;
                Object.entries(productsStep).forEach(([otherRangeName, otherProductCodes]: [string, any]) => {
                  if (otherRangeName && otherRangeName !== '' && otherRangeName !== 'undefined') {
                    if ((otherProductCodes as string[]).includes(code)) {
                      const rangeId = generateId(otherRangeName);
                      if (!rangeToProducts[rangeId]) {
                        rangeToProducts[rangeId] = [];
                      }
                      if (!rangeToProducts[rangeId].includes(generateId(code))) {
                        rangeToProducts[rangeId].push(generateId(code));
                      }
                      found = true;
                    }
                  }
                });
              });
            } else {
              // Normal range entry
              const rangeId = generateId(rangeName);
              rangeToProducts[rangeId] = (productCodes as string[]).map((code) => generateId(code));
            }
          });

          draft.relationships = {
            groupToRanges,
            rangeToProducts,
          };
        }),

      updateProductData: (data: ProductDataStructure) =>
        set((draft) => {
          draft.productData = data;
          draft.isDirty = true;
        }),

      exportData: () => {
        const { productGroups, productRanges, products, relationships, productData } = get();

        const updatedData: ProductDataStructure = {
          id: productData.id,
          stepperForm: {
            steps: [
              {
                step: 1,
                title: "Select Product Group",
                categories: productGroups.map((group) => group.name),
              },
              {
                step: 2,
                title: "Select Product Range",
                ranges: (() => {
                  const rangesObj: Record<string, string[]> = {};
                  Object.entries(relationships.groupToRanges).forEach(([groupId, rangeIds]) => {
                    const group = productGroups.find((g) => g.id === groupId);
                    if (group) {
                      rangesObj[group.name] = rangeIds
                        .map((rangeId) => {
                          const range = productRanges.find((r) => r.id === rangeId);
                          return range ? range.name : "";
                        })
                        .filter((name) => name !== "");
                    }
                  });
                  return rangesObj;
                })(),
              },
              {
                step: 3,
                title: "Select Individual Product",
                products: (() => {
                  const productsObj: Record<string, string[]> = {};
                  Object.entries(relationships.rangeToProducts).forEach(([rangeId, productIds]) => {
                    const range = productRanges.find((r) => r.id === rangeId);
                    if (range) {
                      productsObj[range.name] = productIds
                        .map((productId) => {
                          const product = products.find((p) => p.id === productId);
                          return product ? product.code : "";
                        })
                        .filter((code) => code !== "");
                    }
                  });
                  return productsObj;
                })(),
              },
              {
                step: 4,
                title: "View Product Content",
                productDetails: (() => {
                  const detailsObj: Record<string, ProductContent> = {};
                  products.forEach((product) => {
                    detailsObj[product.code] = {
                      name: product.name,
                      overview: product.overview,
                      description: product.description,
                      specifications: product.specifications,
                      imageGallery: product.imageGallery,
                      files: product.files,
                      // include faqs so they are exported into stepper_form_data
                      faqs: product.faqs || [],
                    };
                  });
                  return detailsObj;
                })(),
              },
              {
                step: 5,
                title: "Configure Options",
                // Build global options from all products that have options
                options: (() => {
                  const globalOptions: Record<string, Array<{ value: string; imageUrl?: string }>> = {};

                  products.forEach((product) => {
                    if (product.options) {
                      Object.entries(product.options).forEach(([optionGroup, optionValues]) => {
                        if (!globalOptions[optionGroup]) {
                          globalOptions[optionGroup] = [];
                        }

                        // Merge option values, avoiding duplicates
                        optionValues.forEach((optionValue) => {
                          const exists = globalOptions[optionGroup].some((existing) => existing.value === optionValue.value);
                          if (!exists) {
                            globalOptions[optionGroup].push(optionValue);
                          }
                        });
                      });
                    }
                  });

                  return globalOptions;
                })(),
                // Also store product-specific options for reference
                productOptions: (() => {
                  const productOptionsMap: Record<string, Record<string, Array<{ value: string; imageUrl?: string }>>> = {};

                  products.forEach((product) => {
                    if (product.options && Object.keys(product.options).length > 0) {
                      productOptionsMap[product.code] = product.options;
                    }
                  });

                  return productOptionsMap;
                })(),
              },
              productData.stepperForm.steps[5] || {
                step: 6,
                title: "Contact Information",
                fields: initialProductData.stepperForm.steps[5].fields,
              },
            ],
          },
        };

        return updatedData;
      },

      // Product Group actions
      addProductGroup: (group: Omit<ProductGroup, "id">) =>
        set((draft) => {
          const id = generateId(group.name);
          const newGroup: ProductGroup = {
            ...group,
            id,
            icon: group.icon || getDefaultIconForGroup(group.name),
            description: group.description || getDescriptionForGroup(group.name),
            active: group.active !== undefined ? group.active : true,
          };

          // Check if group already exists
          const exists = draft.productGroups.some((g) => g.id === id);
          if (!exists) {
            draft.productGroups.push(newGroup);
            draft.relationships.groupToRanges[id] = [];
            draft.isDirty = true;
          }
        }),

      updateProductGroup: (id: string, updates: Partial<ProductGroup>) =>
        set((draft) => {
          const index = draft.productGroups.findIndex((g) => g.id === id);
          if (index !== -1) {
            draft.productGroups[index] = { ...draft.productGroups[index], ...updates };
            draft.isDirty = true;
          }
        }),

      removeProductGroup: (id: string) =>
        set((draft) => {
          draft.productGroups = draft.productGroups.filter((g) => g.id !== id);

          // Remove associated ranges and their products
          const rangeIds = draft.relationships.groupToRanges[id] || [];
          rangeIds.forEach((rangeId) => {
            draft.productRanges = draft.productRanges.filter((r) => r.id !== rangeId);

            // Remove associated products
            const productIds = draft.relationships.rangeToProducts[rangeId] || [];
            productIds.forEach((productId) => {
              draft.products = draft.products.filter((p) => p.id !== productId);
            });
            delete draft.relationships.rangeToProducts[rangeId];
          });

          delete draft.relationships.groupToRanges[id];
          draft.isDirty = true;
        }),

      // Product Range actions
      addProductRange: (range: Omit<ProductRange, "id">) =>
        set((draft) => {
          const id = generateId(range.name);
          const newRange: ProductRange = {
            ...range,
            id,
            description: range.description || getDescriptionForRange(range.name),
            tags: range.tags || getTagsForRange(range.name),
            active: range.active !== undefined ? range.active : true,
            groupName: range.groupName || '',
          };

          // Check if range already exists
          const exists = draft.productRanges.some((r) => r.id === id);
          if (!exists) {
            draft.productRanges.push(newRange);
            draft.relationships.rangeToProducts[id] = [];
            draft.isDirty = true;
          }
        }),

      updateProductRange: (id: string, updates: Partial<ProductRange>) =>
        set((draft) => {
          const index = draft.productRanges.findIndex((r) => r.id === id);
          if (index !== -1) {
            draft.productRanges[index] = { ...draft.productRanges[index], ...updates };
            // If groupName is updated, update it here
            if (updates.groupName) {
              draft.productRanges[index].groupName = updates.groupName;
            }
            draft.isDirty = true;
          }
        }),

      removeProductRange: (id: string) =>
        set((draft) => {
          draft.productRanges = draft.productRanges.filter((r) => r.id !== id);

          // Remove associated products
          const productIds = draft.relationships.rangeToProducts[id] || [];
          productIds.forEach((productId) => {
            draft.products = draft.products.filter((p) => p.id !== productId);
          });

          // Remove from group relationships
          Object.keys(draft.relationships.groupToRanges).forEach((groupId) => {
            draft.relationships.groupToRanges[groupId] = draft.relationships.groupToRanges[groupId].filter((rangeId) => rangeId !== id);
          });

          delete draft.relationships.rangeToProducts[id];
          draft.isDirty = true;
        }),

      // Product actions
      addProduct: (product: Omit<Product, "id">) =>
        set((draft) => {
          const id = generateId(product.code || product.name);
          const newProduct: Product = {
            ...product,
            id,
            code: product.code || generateId(product.name),
            active: product.active !== undefined ? product.active : true,
          };

          // Check if product already exists
          const exists = draft.products.some((p) => p.id === id);
          if (!exists) {
            draft.products.push(newProduct);
            draft.isDirty = true;
          }
        }),

      updateProduct: (id: string, updates: Partial<Product>) =>
        set((draft) => {
          const index = draft.products.findIndex((p) => p.id === id);
          if (index !== -1) {
            draft.products[index] = { ...draft.products[index], ...updates };
            draft.isDirty = true;
          }
        }),

      removeProduct: (id: string) =>
        set((draft) => {
          draft.products = draft.products.filter((p) => p.id !== id);

          // Remove from range relationships
          Object.keys(draft.relationships.rangeToProducts).forEach((rangeId) => {
            draft.relationships.rangeToProducts[rangeId] = draft.relationships.rangeToProducts[rangeId].filter(
              (productId) => productId !== id
            );
          });

          draft.isDirty = true;
        }),

      // Relationship actions
      linkRangeToGroup: (groupId: string, rangeId: string) =>
        set((draft) => {
          if (!draft.relationships.groupToRanges[groupId]) {
            draft.relationships.groupToRanges[groupId] = [];
          }
          if (!draft.relationships.groupToRanges[groupId].includes(rangeId)) {
            draft.relationships.groupToRanges[groupId].push(rangeId);
            draft.isDirty = true;
          }
        }),

      unlinkRangeFromGroup: (groupId: string, rangeId: string) =>
        set((draft) => {
          if (draft.relationships.groupToRanges[groupId]) {
            draft.relationships.groupToRanges[groupId] = draft.relationships.groupToRanges[groupId].filter((id) => id !== rangeId);
            draft.isDirty = true;
          }
        }),

      linkProductToRange: (rangeId: string, productId: string) =>
        set((draft) => {
          if (!draft.relationships.rangeToProducts[rangeId]) {
            draft.relationships.rangeToProducts[rangeId] = [];
          }
          if (!draft.relationships.rangeToProducts[rangeId].includes(productId)) {
            draft.relationships.rangeToProducts[rangeId].push(productId);
            draft.isDirty = true;
          }
        }),

      unlinkProductFromRange: (rangeId: string, productId: string) =>
        set((draft) => {
          if (draft.relationships.rangeToProducts[rangeId]) {
            draft.relationships.rangeToProducts[rangeId] = draft.relationships.rangeToProducts[rangeId].filter((id) => id !== productId);
            draft.isDirty = true;
          }
        }),

      updateRelationships: (relationships: Relationships) =>
        set((draft) => {
          draft.relationships = relationships;
          draft.isDirty = true;
        }),

      // Options and fields
      updateOptions: (options: Record<string, Array<string | { value: string; imageUrl?: string }>>) =>
        set((draft) => {
          if (draft.productData.stepperForm.steps[4]) {
            // Convert simple string arrays to object arrays with value and imageUrl
            const formattedOptions: Record<string, Array<{ value: string; imageUrl?: string }>> = {};

            Object.entries(options).forEach(([key, values]) => {
              formattedOptions[key] = values.map((val) => {
                if (typeof val === "string") {
                  return { value: val };
                }
                return val;
              });
            });

            draft.productData.stepperForm.steps[4].options = formattedOptions;
            draft.isDirty = true;
          }
        }),

      updateContactFields: (fields: any[]) =>
        set((draft) => {
          if (draft.productData.stepperForm.steps[5]) {
            draft.productData.stepperForm.steps[5].fields = fields;
            draft.isDirty = true;
          }
        }),

      resetData: () =>
        set((draft) => {
          draft.productData = initialProductData;
          draft.productGroups = [];
          draft.productRanges = [];
          draft.products = [];
          draft.relationships = {
            groupToRanges: {},
            rangeToProducts: {},
          };
          draft.isDirty = false;
          draft.lastSaved = null;
          draft.error = null;
        }),

      importData: (data: ProductDataStructure) =>
        set((draft) => {
          draft.isDirty = true;
          draft.lastSaved = null;
          draft.error = null;
          get().initializeFromProductData(data);
        }),

      // Utility actions
      setError: (error: string | null) =>
        set((draft) => {
          draft.error = error;
        }),
      clearError: () =>
        set((draft) => {
          draft.error = null;
        }),
    })),
    { name: "urbana-data-builder" }
  )
);
