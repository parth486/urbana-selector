import React from "react";
import { Input, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
  description?: string;
}

export const TagInput: React.FC<TagInputProps> = ({ 
  tags, 
  onTagsChange, 
  placeholder = "Add tag...",
  label,
  description
}) => {
  const [inputValue, setInputValue] = React.useState("");
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      
      // Don't add duplicate tags
      if (!tags.includes(inputValue.trim())) {
        onTagsChange([...tags, inputValue.trim()]);
      }
      
      setInputValue("");
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <Input
        label={label}
        placeholder={placeholder}
        value={inputValue}
        onValueChange={setInputValue}
        onKeyDown={handleKeyDown}
        description={description}
        startContent={
          inputValue.trim() === "" && tags.length === 0 ? (
            <Icon icon="lucide:tag" className="text-default-400" width={16} />
          ) : null
        }
      />
      
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {tags.map((tag) => (
            <Chip 
              key={tag} 
              onClose={() => handleRemoveTag(tag)}
              variant="flat"
            >
              {tag}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
};