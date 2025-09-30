import React from "react";
import { Input, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";

interface ProductSpecificationsProps {
  specifications: string[];
  onChange: (specifications: string[]) => void;
}

export const ProductSpecifications: React.FC<ProductSpecificationsProps> = ({ 
  specifications, 
  onChange 
}) => {
  const [newSpec, setNewSpec] = React.useState("");

  const handleAddSpecification = () => {
    if (newSpec.trim()) {
      onChange([...specifications, newSpec.trim()]);
      setNewSpec("");
    }
  };

  const handleRemoveSpecification = (index: number) => {
    const updatedSpecs = [...specifications];
    updatedSpecs.splice(index, 1);
    onChange(updatedSpecs);
  };

  const handleUpdateSpecification = (index: number, value: string) => {
    const updatedSpecs = [...specifications];
    updatedSpecs[index] = value;
    onChange(updatedSpecs);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newSpec.trim()) {
      e.preventDefault();
      handleAddSpecification();
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-2">
        <Input
          label="Add Specification"
          placeholder="Enter product specification"
          value={newSpec}
          onValueChange={setNewSpec}
          onKeyDown={handleKeyDown}
          className="flex-grow"
        />
        <Button
          color="primary"
          isIconOnly
          onPress={handleAddSpecification}
          className="mt-6"
        >
          <Icon icon="lucide:plus" width={18} />
        </Button>
      </div>
      
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Specifications List</h4>
        
        {specifications.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-default-200 rounded-medium">
            <Icon icon="lucide:list" className="mx-auto mb-2 text-default-400" width={24} />
            <p className="text-default-500">No specifications added yet</p>
          </div>
        ) : (
          <AnimatePresence>
            {specifications.map((spec, index) => (
              <motion.div
                key={`${spec}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2"
              >
                <Input
                  value={spec}
                  onValueChange={(value) => handleUpdateSpecification(index, value)}
                  className="flex-grow"
                  startContent={<Icon icon="lucide:chevron-right" className="text-primary" width={16} />}
                />
                <Button
                  isIconOnly
                  color="danger"
                  variant="flat"
                  size="sm"
                  onPress={() => handleRemoveSpecification(index)}
                >
                  <Icon icon="lucide:trash-2" width={16} />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};