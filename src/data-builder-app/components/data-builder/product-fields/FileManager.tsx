import React, { useCallback } from "react";
import {
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Divider,
  Chip,
} from "@heroui/react";
import { Icon } from "@iconify/react";

interface FileManagerProps {
  files: Record<string, string>;
  onFilesChange: (files: Record<string, string>) => void;
  productCode?: string;
  category?: string;
  range?: string;
}

export const FileManager: React.FC<FileManagerProps> = ({ files, onFilesChange, productCode, category, range }) => {
  const [fileName, setFileName] = React.useState("");
  const [fileUrl, setFileUrl] = React.useState("");

  const handleAddFile = useCallback(() => {
    if (fileName.trim() && fileUrl.trim()) {
      onFilesChange({
        ...files,
        [fileName.trim()]: fileUrl.trim(),
      });
      setFileName("");
      setFileUrl("");
    }
  }, [fileName, fileUrl, files, onFilesChange]);

  const handleRemoveFile = useCallback(
    (key: string) => {
      const newFiles = { ...files };
      delete newFiles[key];
      onFilesChange(newFiles);
    },
    [files, onFilesChange]
  );

  const openMediaLibrary = useCallback(() => {
    if (!(window as any).wp?.media) {
      console.error("WordPress media library not available");
      return;
    }

    const mediaFrame = (window as any).wp.media({
      title: "Select Files",
      button: {
        text: "Add to Product",
      },
      multiple: true,
    });

    mediaFrame.on("select", () => {
      const attachments = mediaFrame.state().get("selection").toJSON();
      const newFiles = { ...files };

      attachments.forEach((attachment: any) => {
        const fileName = attachment.filename || attachment.title;
        newFiles[fileName] = attachment.url;
      });

      onFilesChange(newFiles);
    });

    mediaFrame.open();
  }, [files, onFilesChange]);

  const fetchFromFolder = useCallback(async () => {
    if (!productCode || !category || !range) {
      console.error("Missing product information for folder fetch");
      return;
    }

    const confirmed = confirm("This will fetch files from the plugin folder and update the current file list. Continue?");

    if (!confirmed) return;

    try {
      // Call API to fetch files from folder
      const response = await fetch("/wp-json/urbana/v1/fetch-product-files", {
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
        throw new Error(`Failed to fetch files: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.files) {
        onFilesChange(result.files);
      } else {
        console.warn("No files found in folder or fetch failed");
      }
    } catch (error) {
      console.error("Error fetching files from folder:", error);
    }
  }, [productCode, category, range, onFilesChange]);

  const getFileIcon = (url: string) => {
    const extension = url.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return "lucide:file-text";
      case "dwg":
      case "dxf":
        return "lucide:compass";
      case "rvt":
        return "lucide:building";
      case "doc":
      case "docx":
        return "lucide:file-type";
      case "xls":
      case "xlsx":
        return "lucide:sheet";
      default:
        return "lucide:file";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center w-full">
          <h4 className="text-md font-semibold">Product Files</h4>
          <div className="flex gap-2">
            {productCode && (
              <Button
                size="sm"
                color="secondary"
                variant="flat"
                onPress={fetchFromFolder}
                startContent={<Icon icon="lucide:folder-sync" width={16} />}
              >
                Fetch from Folder
              </Button>
            )}
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
        {/* Manual File Addition */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="File name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              size="sm"
              classNames={{ input: "urbana-input" }}
            />
            <Input
              placeholder="File URL or path"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              size="sm"
              classNames={{ input: "urbana-input" }}
            />
            <Button size="sm" color="primary" onPress={handleAddFile} isDisabled={!fileName.trim() || !fileUrl.trim()}>
              Add
            </Button>
          </div>
        </div>

        {Object.entries(files).length > 0 && (
          <>
            <Divider />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Files ({Object.entries(files).length})</span>
              </div>

              {Object.entries(files).map(([name, url]) => (
                <div key={name} className="flex justify-between items-center p-3 bg-default-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon icon={getFileIcon(url)} width={20} className="text-primary-500" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{name}</span>
                      <p className="text-xs text-foreground-500 truncate">{url}</p>
                    </div>
                  </div>

                  <Dropdown>
                    <DropdownTrigger>
                      <Button isIconOnly size="sm" variant="light">
                        <Icon icon="lucide:more-vertical" width={16} />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu>
                      <DropdownItem
                        key="view"
                        startContent={<Icon icon="lucide:external-link" width={16} />}
                        onPress={() => window.open(url, "_blank")}
                      >
                        View File
                      </DropdownItem>
                      <DropdownItem
                        key="remove"
                        className="text-danger"
                        color="danger"
                        startContent={<Icon icon="lucide:trash" width={16} />}
                        onPress={() => handleRemoveFile(name)}
                      >
                        Remove
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              ))}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
};
