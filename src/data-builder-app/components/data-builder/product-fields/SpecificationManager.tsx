import React, { useCallback } from "react";
import { Button, Input, Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";

interface SpecificationManagerProps {
  specifications: string[];
  onSpecificationsChange: (specs: string[]) => void;
}

export const SpecificationManager: React.FC<SpecificationManagerProps> = ({ specifications, onSpecificationsChange }) => {
  const [inputValue, setInputValue] = React.useState("");

  const handleAddSpec = useCallback(() => {
    if (inputValue.trim() && !specifications.includes(inputValue.trim())) {
      onSpecificationsChange([...specifications, inputValue.trim()]);
      setInputValue("");
    }
  }, [inputValue, specifications, onSpecificationsChange]);

  const handleRemoveSpec = useCallback(
    (spec: string) => {
      onSpecificationsChange(specifications.filter((s) => s !== spec));
    },
    [specifications, onSpecificationsChange]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleAddSpec();
      }
    },
    [handleAddSpec]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <h4 className="text-md font-semibold">Product Specifications</h4>
      </CardHeader>

      <CardBody className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add specification (e.g., Dimensions: 3.0m x 3.0m)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            size="sm"
            classNames={{ input: "urbana-input" }}
            className="flex-1"
          />
          <Button
            size="sm"
            color="primary"
            onPress={handleAddSpec}
            isDisabled={!inputValue.trim() || specifications.includes(inputValue.trim())}
            startContent={<Icon icon="lucide:plus" width={16} />}
          >
            Add
          </Button>
        </div>

        {specifications.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Specifications ({specifications.length})</span>
            </div>

            <div className="space-y-2">
              {specifications.map((spec, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-default-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary-600">{index + 1}</span>
                    </div>
                    <span className="text-sm flex-1">{spec}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => handleRemoveSpec(spec)}
                    startContent={<Icon icon="lucide:x" width={14} />}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
