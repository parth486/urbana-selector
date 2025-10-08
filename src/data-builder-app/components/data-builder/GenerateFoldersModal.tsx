import React, { useState, useMemo, useCallback } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  ScrollShadow,
  Chip,
  Progress,
  Divider,
  Checkbox,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { AssetGenerator, AssetStructure } from "../../utils/assetGenerator";
import { useDataBuilderStore } from "../../stores/useDataBuilderStore";
import { addToast } from "@heroui/react";

interface GenerateFoldersModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GenerateFoldersModal: React.FC<GenerateFoldersModalProps> = ({ isOpen, onOpenChange }) => {
  const { productGroups, productRanges, products, relationships, updateProduct } = useDataBuilderStore();

  const [structures, setStructures] = useState<AssetStructure[]>([]);
  const [folderPreview, setFolderPreview] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    success: boolean;
    message: string;
    created: string[];
  } | null>(null);
  const [updatePaths, setUpdatePaths] = useState(true);

  // Memoize calculations for performance
  const stats = useMemo(() => {
    const categories = new Set(structures.map((s) => s.category));
    const ranges = new Set(structures.map((s) => s.range));

    return {
      products: structures.length,
      folders: folderPreview.length,
      categories: categories.size,
      ranges: ranges.size,
    };
  }, [structures, folderPreview]);

  React.useEffect(() => {
    if (isOpen) {
      // Generate the structure when modal opens
      const assetStructures = AssetGenerator.generateAssetStructure(productGroups, productRanges, products, relationships);
      setStructures(assetStructures);
      setFolderPreview(AssetGenerator.generateFolderPreview(assetStructures));
      setGenerationResult(null);
    }
  }, [isOpen, productGroups, productRanges, products, relationships]);

  const handleGenerateFolders = useCallback(async () => {
    setIsGenerating(true);
    setGenerationResult(null);

    try {
      const result = await AssetGenerator.generateFoldersAPI(structures);
      setGenerationResult(result);

      // Update product paths if requested
      if (updatePaths && result.success) {
        const updatedProducts = AssetGenerator.updateProductPaths(products, structures);
        updatedProducts.forEach((product) => {
          updateProduct(product.id, {
            imageGallery: product.imageGallery,
            files: product.files,
          });
        });

        addToast({
          color: "success",
          title: "Folders created and product paths updated!",
        });
      } else if (result.success) {
        addToast({
          color: "success",
          title: result.message,
        });
      } else {
        addToast({
          color: "danger",
          title: result.message,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setGenerationResult({
        success: false,
        message: errorMessage,
        created: [],
      });

      addToast({
        color: "danger",
        title: "Failed to generate folders",
        description: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [structures, updatePaths, products, updateProduct]);

  const handleClose = useCallback(() => {
    setGenerationResult(null);
    setIsGenerating(false);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="3xl"
      scrollBehavior="inside"
      className="urbana-modal"
      isDismissable={!isGenerating}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Icon icon="lucide:folder-plus" width={20} />
                Generate Asset Folders
              </div>
              <p className="text-sm text-foreground-500 font-normal">Create organized folder structure for product assets</p>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-6">
                {/* Summary */}
                <Card className="bg-gradient-to-r from-primary-50 to-secondary-50">
                  <CardBody>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{stats.products}</div>
                        <div className="text-sm text-foreground-500">Products</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-secondary">{stats.folders}</div>
                        <div className="text-sm text-foreground-500">Folders</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-success">{stats.categories}</div>
                        <div className="text-sm text-foreground-500">Categories</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-warning">{stats.ranges}</div>
                        <div className="text-sm text-foreground-500">Ranges</div>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Options */}
                <Card>
                  <CardBody>
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Icon icon="lucide:settings" width={16} />
                        Options
                      </h4>
                      <Checkbox isSelected={updatePaths} onValueChange={setUpdatePaths} isDisabled={isGenerating} size="sm">
                        <div className="ml-2">
                          <div className="font-medium">Update product paths automatically</div>
                          <div className="text-xs text-foreground-500">
                            This will update existing products to use the new folder structure paths
                          </div>
                        </div>
                      </Checkbox>
                    </div>
                  </CardBody>
                </Card>

                {/* Preview */}
                <Card>
                  <CardBody>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Icon icon="lucide:eye" width={16} />
                          Folder Structure Preview
                        </h4>
                        <Chip size="sm" variant="flat" color="primary">
                          {folderPreview.length} folders
                        </Chip>
                      </div>

                      <ScrollShadow className="max-h-60">
                        <div className="space-y-1 font-mono text-sm">
                          {folderPreview.map((folder, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 rounded-md hover:bg-default-100">
                              <Icon
                                icon={folder.includes("/images") ? "lucide:image" : "lucide:file"}
                                width={14}
                                className={folder.includes("/images") ? "text-primary" : "text-secondary"}
                              />
                              <span className="text-foreground-700 break-all">{folder}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollShadow>
                    </div>
                  </CardBody>
                </Card>

                {/* Generation Progress */}
                {isGenerating && (
                  <Card className="border-primary">
                    <CardBody>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Icon icon="lucide:loader" width={16} className="animate-spin text-primary" />
                          <span className="font-semibold">Generating Folders...</span>
                        </div>
                        <Progress isIndeterminate color="primary" size="sm" className="w-full" />
                        <p className="text-sm text-foreground-500">Please wait while we create the folder structure...</p>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Generation Result */}
                {generationResult && (
                  <Card className={generationResult.success ? "border-success" : "border-danger"}>
                    <CardBody>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Icon
                            icon={generationResult.success ? "lucide:check-circle" : "lucide:x-circle"}
                            width={16}
                            className={generationResult.success ? "text-success" : "text-danger"}
                          />
                          <span className="font-semibold">{generationResult.success ? "Success!" : "Error"}</span>
                        </div>

                        <p className="text-sm">{generationResult.message}</p>

                        {generationResult.created.length > 0 && (
                          <div>
                            <Divider className="my-3" />
                            <p className="text-sm font-medium mb-2">Created folders:</p>
                            <ScrollShadow className="max-h-32">
                              <div className="space-y-1">
                                {generationResult.created.map((folder, index) => (
                                  <div key={index} className="text-xs text-success-600 font-mono flex items-center gap-1">
                                    <Icon icon="lucide:check" width={12} />
                                    {folder}
                                  </div>
                                ))}
                              </div>
                            </ScrollShadow>
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Instructions */}
                {!generationResult && (
                  <Card className="bg-warning-50 border-warning">
                    <CardBody>
                      <div className="space-y-3">
                        <h4 className="font-semibold text-warning-600 flex items-center gap-2">
                          <Icon icon="lucide:info" width={16} />
                          Instructions
                        </h4>
                        <ul className="text-sm space-y-2 text-foreground-600">
                          <li className="flex items-start gap-2">
                            <Icon icon="lucide:check" width={14} className="mt-0.5 text-success" />
                            This will create physical folders in your plugin's assets directory
                          </li>
                          <li className="flex items-start gap-2">
                            <Icon icon="lucide:check" width={14} className="mt-0.5 text-success" />
                            Each product will get dedicated images/ and downloads/ folders
                          </li>
                          <li className="flex items-start gap-2">
                            <Icon icon="lucide:check" width={14} className="mt-0.5 text-success" />
                            Folder structure follows: category/range/product-code/
                          </li>
                          <li className="flex items-start gap-2">
                            <Icon icon="lucide:check" width={14} className="mt-0.5 text-success" />
                            README files will be created to guide file placement
                          </li>
                        </ul>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </ModalBody>

            <ModalFooter>
              <Button variant="light" onPress={handleClose} isDisabled={isGenerating}>
                {generationResult ? "Close" : "Cancel"}
              </Button>

              {!generationResult && (
                <Button
                  color="primary"
                  onPress={handleGenerateFolders}
                  isLoading={isGenerating}
                  isDisabled={isGenerating || structures.length === 0}
                  startContent={!isGenerating ? <Icon icon="lucide:folder-plus" width={16} /> : undefined}
                >
                  {isGenerating ? "Generating..." : "Generate Folders"}
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
