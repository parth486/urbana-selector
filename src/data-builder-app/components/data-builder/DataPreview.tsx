import React from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { Icon } from "@iconify/react";

interface DataPreviewProps {
  data: any;
}

export const DataPreview: React.FC<DataPreviewProps> = ({ data }) => {
  const [expandedSections, setExpandedSections] = React.useState<string[]>([]);
  
  const toggleSection = (section: string) => {
    if (expandedSections.includes(section)) {
      setExpandedSections(expandedSections.filter(s => s !== section));
    } else {
      setExpandedSections([...expandedSections, section]);
    }
  };
  
  const isSectionExpanded = (section: string) => {
    return expandedSections.includes(section);
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Data Preview</h3>
        <Button 
          color="primary" 
          variant="flat"
          onPress={copyToClipboard}
          startContent={<Icon icon="lucide:copy" width={18} />}
        >
          Copy JSON
        </Button>
      </div>
      
      <Card>
        <CardBody className="p-0">
          <div className="overflow-auto max-h-[600px]">
            <pre className="p-6 text-sm font-mono">
              {renderJsonTree(data, 0, "", expandedSections, toggleSection)}
            </pre>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

function renderJsonTree(
  data: any, 
  level: number, 
  path: string, 
  expandedSections: string[], 
  toggleSection: (section: string) => void
): React.ReactNode {
  const indent = "  ".repeat(level);
  
  if (data === null) {
    return <span className="text-danger">null</span>;
  }
  
  if (typeof data === "undefined") {
    return <span className="text-danger">undefined</span>;
  }
  
  if (typeof data === "string") {
    return <span className="text-success">"{data}"</span>;
  }
  
  if (typeof data === "number" || typeof data === "boolean") {
    return <span className="text-warning">{String(data)}</span>;
  }
  
  if (Array.isArray(data)) {
    const currentPath = path ? `${path}.${level}` : `${level}`;
    const isExpanded = expandedSections.includes(currentPath);
    
    if (data.length === 0) {
      return <span>[]</span>;
    }
    
    if (!isExpanded) {
      return (
        <span>
          <span 
            className="cursor-pointer text-default-500 hover:text-primary"
            onClick={() => toggleSection(currentPath)}
          >
            <Icon icon="lucide:plus-square" className="inline-block mr-1" width={14} />
            [... {data.length} items]
          </span>
        </span>
      );
    }
    
    return (
      <span>
        <span 
          className="cursor-pointer text-default-500 hover:text-primary"
          onClick={() => toggleSection(currentPath)}
        >
          <Icon icon="lucide:minus-square" className="inline-block mr-1" width={14} />
          [
        </span>
        {data.map((item, index) => (
          <React.Fragment key={index}>
            <br />
            {indent}  {renderJsonTree(item, level + 1, `${currentPath}.${index}`, expandedSections, toggleSection)}
            {index < data.length - 1 && ","}
          </React.Fragment>
        ))}
        <br />
        {indent}]
      </span>
    );
  }
  
  if (typeof data === "object") {
    const currentPath = path ? `${path}.${level}` : `${level}`;
    const isExpanded = expandedSections.includes(currentPath);
    const keys = Object.keys(data);
    
    if (keys.length === 0) {
      return <span>{"{}"}</span>;
    }
    
    if (!isExpanded) {
      return (
        <span>
          <span 
            className="cursor-pointer text-default-500 hover:text-primary"
            onClick={() => toggleSection(currentPath)}
          >
            <Icon icon="lucide:plus-square" className="inline-block mr-1" width={14} />
            {"{"} ... {keys.length} keys {"}"}
          </span>
        </span>
      );
    }
    
    return (
      <span>
        <span 
          className="cursor-pointer text-default-500 hover:text-primary"
          onClick={() => toggleSection(currentPath)}
        >
          <Icon icon="lucide:minus-square" className="inline-block mr-1" width={14} />
          {"{"}
        </span>
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            <br />
            {indent}  <span className="text-primary">"{key}"</span>: {renderJsonTree(data[key], level + 1, `${currentPath}.${key}`, expandedSections, toggleSection)}
            {index < keys.length - 1 && ","}
          </React.Fragment>
        ))}
        <br />
        {indent}{"}"}
      </span>
    );
  }
  
  return String(data);
}