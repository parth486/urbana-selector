import React, { useCallback, useMemo } from "react";
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
  Chip,
  Accordion,
  AccordionItem,
} from "@heroui/react";
import { Icon } from "@iconify/react";

interface OptionItem {
  value: string;
  imageUrl?: string;
}

interface OptionsManagerProps {
  options: Record<string, Array<OptionItem>>;
  onOptionsChange: (options: Record<string, Array<OptionItem>>) => void;
}

export const OptionsManager: React.FC<OptionsManagerProps> = ({ options, onOptionsChange }) => {
  const optionGroups = useMemo(() => Object.keys(options).sort(), [options]);

  const handleAddOptionGroup = useCallback(() => {
    const groupName = prompt("Enter option group name (e.g., Color Scheme, Post Material):");
    if (!groupName || !groupName.trim()) return;

    const trimmedName = groupName.trim();

    if (options[trimmedName]) {
      alert("An option group with this name already exists");
      return;
    }

    onOptionsChange({
      ...options,
      [trimmedName]: [],
    });
  }, [options, onOptionsChange]);

  const handleRemoveOptionGroup = useCallback(
    (groupName: string) => {
      if (!confirm(`Remove the entire "${groupName}" option group?`)) return;

      const newOptions = { ...options };
      delete newOptions[groupName];
      onOptionsChange(newOptions);
    },
    [options, onOptionsChange]
  );

  const handleRenameOptionGroup = useCallback(
    (oldName: string) => {
      const newName = prompt("Enter new name for option group:", oldName);
      if (!newName || !newName.trim() || newName.trim() === oldName) return;

      const trimmedName = newName.trim();

      if (options[trimmedName]) {
        alert("An option group with this name already exists");
        return;
      }

      const newOptions = { ...options };
      newOptions[trimmedName] = newOptions[oldName];
      delete newOptions[oldName];
      onOptionsChange(newOptions);
    },
    [options, onOptionsChange]
  );

  const handleAddOption = useCallback(
    (groupName: string) => {
      const value = prompt("Enter option value:");
      if (!value || !value.trim()) return;

      const trimmedValue = value.trim();

      // Check if option already exists in this group
      if (options[groupName].some((opt) => opt.value === trimmedValue)) {
        alert("This option value already exists in this group");
        return;
      }

      const newOptions = { ...options };
      newOptions[groupName] = [...newOptions[groupName], { value: trimmedValue }];
      onOptionsChange(newOptions);
    },
    [options, onOptionsChange]
  );

  const handleRemoveOption = useCallback(
    (groupName: string, index: number) => {
      const newOptions = { ...options };
      newOptions[groupName] = newOptions[groupName].filter((_, i) => i !== index);
      onOptionsChange(newOptions);
    },
    [options, onOptionsChange]
  );

  const handleUpdateOption = useCallback(
    (groupName: string, index: number, field: keyof OptionItem, value: string) => {
      const newOptions = { ...options };
      newOptions[groupName] = [...newOptions[groupName]];
      newOptions[groupName][index] = {
        ...newOptions[groupName][index],
        [field]: value,
      };
      onOptionsChange(newOptions);
    },
    [options, onOptionsChange]
  );

  const openMediaLibrary = useCallback(
    (groupName: string, index: number) => {
      if (!(window as any).wp?.media) {
        console.error("WordPress media library not available");
        return;
      }

      const mediaFrame = (window as any).wp.media({
        title: "Select Option Image",
        button: {
          text: "Use Image",
        },
        multiple: false,
        library: {
          type: "image",
        },
      });

      mediaFrame.on("select", () => {
        const attachment = mediaFrame.state().get("selection").first().toJSON();
        handleUpdateOption(groupName, index, "imageUrl", attachment.url);
      });

      mediaFrame.open();
    },
    [handleUpdateOption]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center w-full">
          <div>
            <h4 className="text-md font-semibold">Product Options</h4>
            <p className="text-sm text-foreground-500">Configure product options with associated images</p>
          </div>
          <Button
            size="sm"
            color="primary"
            variant="flat"
            onPress={handleAddOptionGroup}
            startContent={<Icon icon="lucide:plus" width={16} />}
          >
            Add Option Group
          </Button>
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        {optionGroups.length === 0 ? (
          <div className="text-center py-8">
            <Icon icon="lucide:settings" width={48} className="text-foreground-300 mx-auto mb-3" />
            <p className="text-sm text-foreground-500">No option groups yet. Add one to get started.</p>
          </div>
        ) : (
          <Accordion variant="bordered" selectionMode="multiple">
            {optionGroups.map((groupName) => {
              const groupOptions = options[groupName] || [];

              return (
                <AccordionItem
                  key={groupName}
                  aria-label={groupName}
                  title={
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <Icon icon="lucide:tag" width={18} className="text-primary" />
                        <span className="font-semibold">{groupName}</span>
                        <Chip size="sm" variant="flat" color="primary">
                          {groupOptions.length}
                        </Chip>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => handleRenameOptionGroup(groupName)}
                          title="Rename group"
                        >
                          <Icon icon="lucide:edit-3" width={14} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => handleRemoveOptionGroup(groupName)}
                          title="Remove group"
                        >
                          <Icon icon="lucide:trash" width={14} />
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <div className="space-y-4 pt-2">
                    {groupOptions.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {groupOptions.map((option, index) => (
                          <div key={index} className="border border-default-200 rounded-lg p-3 space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                {option.imageUrl ? (
                                  <div className="relative group w-20 h-20 rounded-lg overflow-hidden border-2 border-default-200">
                                    <Image
                                      src={option.imageUrl}
                                      alt={option.value}
                                      className="w-full h-full object-cover"
                                      fallback={
                                        <div className="w-full h-full bg-default-100 flex items-center justify-center">
                                          <Icon icon="lucide:image" width={24} className="text-default-400" />
                                        </div>
                                      }
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                      <Button
                                        isIconOnly
                                        size="sm"
                                        variant="solid"
                                        color="primary"
                                        onPress={() => openMediaLibrary(groupName, index)}
                                        title="Change image"
                                      >
                                        <Icon icon="lucide:image" width={14} />
                                      </Button>
                                      <Button
                                        isIconOnly
                                        size="sm"
                                        variant="solid"
                                        color="danger"
                                        onPress={() => handleUpdateOption(groupName, index, "imageUrl", "")}
                                        title="Remove image"
                                      >
                                        <Icon icon="lucide:x" width={14} />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button className="w-20 h-20" variant="bordered" onPress={() => openMediaLibrary(groupName, index)}>
                                    <div className="flex flex-col items-center justify-center gap-1">
                                      <Icon icon="lucide:image-plus" width={20} className="text-default-400" />
                                      <span className="text-xs">Add Image</span>
                                    </div>
                                  </Button>
                                )}
                              </div>

                              <div className="flex-1 space-y-2">
                                <Input
                                  placeholder="Option value"
                                  value={option.value}
                                  onChange={(e) => handleUpdateOption(groupName, index, "value", e.target.value)}
                                  size="sm"
                                  classNames={{ input: "urbana-input" }}
                                  endContent={
                                    <Button
                                      isIconOnly
                                      size="sm"
                                      variant="light"
                                      color="danger"
                                      onPress={() => handleRemoveOption(groupName, index)}
                                      title="Remove option"
                                    >
                                      <Icon icon="lucide:trash-2" width={14} />
                                    </Button>
                                  }
                                />

                                <Input
                                  placeholder="Image URL (optional)"
                                  value={option.imageUrl || ""}
                                  onChange={(e) => handleUpdateOption(groupName, index, "imageUrl", e.target.value)}
                                  size="sm"
                                  classNames={{ input: "urbana-input" }}
                                  startContent={<Icon icon="lucide:link" width={14} className="text-default-400" />}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-foreground-500">No options in this group yet</p>
                      </div>
                    )}

                    <Divider />

                    <div className="flex justify-center">
                      <Button
                        variant="dashed"
                        onPress={() => handleAddOption(groupName)}
                        startContent={<Icon icon="lucide:plus" width={16} />}
                        className="w-full"
                      >
                        Add Option to {groupName}
                      </Button>
                    </div>
                  </div>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardBody>
    </Card>
  );
};
