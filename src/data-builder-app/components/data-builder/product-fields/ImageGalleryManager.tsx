import React, { useCallback } from "react";
import {
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Image,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Divider,
} from "@heroui/react";
import { Icon } from "@iconify/react";

interface ImageGalleryManagerProps {
  imageGallery: string[];
  onImageGalleryChange: (images: string[]) => void;
  productCode?: string;
  category?: string;
  range?: string;
}

export const ImageGalleryManager: React.FC<ImageGalleryManagerProps> = ({
  imageGallery,
  onImageGalleryChange,
  productCode,
  category,
  range,
}) => {
  const handleImageChange = useCallback(
    (index: number, value: string) => {
      const newGallery = [...imageGallery];
      newGallery[index] = value;
      onImageGalleryChange(newGallery);
    },
    [imageGallery, onImageGalleryChange]
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      const newGallery = imageGallery.filter((_, i) => i !== index);
      onImageGalleryChange(newGallery);
    },
    [imageGallery, onImageGalleryChange]
  );

  const handleAddImage = useCallback(() => {
    onImageGalleryChange([...imageGallery, ""]);
  }, [imageGallery, onImageGalleryChange]);

  const openMediaLibrary = useCallback(() => {
    if (!(window as any).wp?.media) {
      console.error("WordPress media library not available");
      return;
    }

    const mediaFrame = (window as any).wp.media({
      title: "Select Images",
      button: {
        text: "Add to Gallery",
      },
      multiple: true,
      library: {
        type: "image",
      },
    });

    mediaFrame.on("select", () => {
      const attachments = mediaFrame.state().get("selection").toJSON();
      const newImages = attachments.map((attachment: any) => attachment.url);
      onImageGalleryChange([...imageGallery, ...newImages]);
    });

    mediaFrame.open();
  }, [imageGallery, onImageGalleryChange]);

  const fetchFromFolder = useCallback(async () => {
    if (!productCode || !category || !range) {
      console.error("Missing product information for folder fetch");
      return;
    }

    const confirmed = confirm("This will fetch images from the plugin folder and update the current gallery. Continue?");

    if (!confirmed) return;

    try {
      const response = await fetch("/wp-json/urbana/v1/fetch-product-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaAdmin?.nonce || "",
        },
        body: JSON.stringify({
          productCode: productCode.toLowerCase(),
          category: category.toLowerCase(),
          range: range.toLowerCase().replace(/\s+/g, "-"),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.images) {
        onImageGalleryChange(result.images);
      } else {
        console.warn("No images found in folder or fetch failed");
      }
    } catch (error) {
      console.error("Error fetching images from folder:", error);
    }
  }, [productCode, category, range, onImageGalleryChange]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center w-full">
          <h4 className="text-md font-semibold">Image Gallery</h4>
          <div className="flex gap-2">
            {/* {productCode && (
              <Button
                size="sm"
                color="secondary"
                variant="flat"
                onPress={fetchFromFolder}
                startContent={<Icon icon="lucide:image-plus" width={16} />}
              >
                Fetch from Folder
              </Button>
            )} */}
            <Button
              size="sm"
              color="primary"
              variant="flat"
              onPress={openMediaLibrary}
              startContent={<Icon icon="lucide:library" width={16} />}
            >
              Media Library
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        {imageGallery.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {imageGallery.map((url, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border-2 border-default-200">
                  {url ? (
                    <Image
                      src={url}
                      alt={`Gallery image ${index + 1}`}
                      className="w-full h-full object-cover"
                      fallback={
                        <div className="w-full h-full bg-default-100 flex items-center justify-center">
                          <Icon icon="lucide:image" width={32} className="text-default-400" />
                        </div>
                      }
                    />
                  ) : (
                    <div className="w-full h-full bg-default-100 flex items-center justify-center">
                      <Icon icon="lucide:image-plus" width={32} className="text-default-400" />
                    </div>
                  )}

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly size="sm" variant="solid" color="default" className="bg-black/50 text-white">
                          <Icon icon="lucide:more-vertical" width={16} />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu>
                        <DropdownItem
                          key="edit"
                          startContent={<Icon icon="lucide:edit" width={16} />}
                          onPress={() => {
                            const newUrl = prompt("Enter image URL:", url);
                            if (newUrl !== null) {
                              handleImageChange(index, newUrl);
                            }
                          }}
                        >
                          Edit URL
                        </DropdownItem>
                        <DropdownItem
                          key="remove"
                          className="text-danger"
                          color="danger"
                          startContent={<Icon icon="lucide:trash" width={16} />}
                          onPress={() => handleRemoveImage(index)}
                        >
                          Remove
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </div>

                <Input
                  placeholder="Image URL"
                  value={url}
                  onChange={(e) => handleImageChange(index, e.target.value)}
                  size="sm"
                  className="mt-2"
                  classNames={{ input: "urbana-input" }}
                />
              </div>
            ))}
          </div>
        )}

        <Divider />

        <div className="flex justify-center">
          <Button variant="dashed" onPress={handleAddImage} startContent={<Icon icon="lucide:plus" width={16} />} className="w-full">
            Add Image
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};
