import React from "react";
import { Input, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";

interface ProductFilesProps {
  files: Record<string, string>;
  onChange: (files: Record<string, string>) => void;
}

export const ProductFiles: React.FC<ProductFilesProps> = ({ files, onChange }) => {
  const [fileName, setFileName] = React.useState("");
  const [fileUrl, setFileUrl] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleAddFile = () => {
    // Validate inputs
    const newErrors: Record<string, string> = {};
    
    if (!fileName.trim()) {
      newErrors.fileName = "File name is required";
    }
    
    if (!fileUrl.trim()) {
      newErrors.fileUrl = "File URL is required";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Add the file
    onChange({
      ...files,
      [fileName.trim()]: fileUrl.trim()
    });
    
    // Reset form
    setFileName("");
    setFileUrl("");
    setErrors({});
  };

  const handleRemoveFile = (name: string) => {
    const newFiles = { ...files };
    delete newFiles[name];
    onChange(newFiles);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFile();
    }
  };

  const getFileIcon = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const iconMap: Record<string, string> = {
      "pdf": "lucide:file-text",
      "dwg": "lucide:file-cog",
      "rvt": "lucide:file-3d",
      "doc": "lucide:file-text",
      "docx": "lucide:file-text",
      "xls": "lucide:file-spreadsheet",
      "xlsx": "lucide:file-spreadsheet",
      "zip": "lucide:file-archive",
      "default": "lucide:file"
    };
    
    return iconMap[extension || ""] || iconMap["default"];
  };

  const generateSampleFileName = (type: string) => {
    const types = {
      "pdf": "Product_Specification.pdf",
      "dwg": "CAD_Drawing.dwg",
      "rvt": "BIM_Model.rvt",
      "doc": "Installation_Guide.doc"
    };
    
    return types[type as keyof typeof types] || "Document.pdf";
  };

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Add File</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="File Name"
            placeholder="e.g., Product Specification"
            value={fileName}
            onValueChange={(value) => {
              setFileName(value);
              if (errors.fileName) setErrors({...errors, fileName: ""});
            }}
            onKeyDown={handleKeyDown}
            isInvalid={!!errors.fileName}
            errorMessage={errors.fileName}
          />
          
          <Input
            label="File URL/Path"
            placeholder="e.g., product_spec.pdf"
            value={fileUrl}
            onValueChange={(value) => {
              setFileUrl(value);
              if (errors.fileUrl) setErrors({...errors, fileUrl: ""});
            }}
            onKeyDown={handleKeyDown}
            isInvalid={!!errors.fileUrl}
            errorMessage={errors.fileUrl}
          />
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="flat" 
              onPress={() => {
                setFileName("PDF Specification");
                setFileUrl(generateSampleFileName("pdf"));
              }}
            >
              Add PDF
            </Button>
            <Button 
              size="sm" 
              variant="flat" 
              onPress={() => {
                setFileName("CAD Drawing");
                setFileUrl(generateSampleFileName("dwg"));
              }}
            >
              Add CAD
            </Button>
            <Button 
              size="sm" 
              variant="flat" 
              onPress={() => {
                setFileName("Revit Model");
                setFileUrl(generateSampleFileName("rvt"));
              }}
            >
              Add BIM
            </Button>
          </div>
          
          <Button 
            color="primary" 
            onPress={handleAddFile}
            startContent={<Icon icon="lucide:plus" width={16} />}
          >
            Add File
          </Button>
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium mb-2">Files List</h4>
        
        {Object.keys(files).length === 0 ? (
          <div className="text-center py-8 border border-dashed border-default-200 rounded-medium">
            <Icon icon="lucide:file" className="mx-auto mb-2 text-default-400" width={24} />
            <p className="text-default-500">No files added yet</p>
          </div>
        ) : (
          <Table aria-label="Product Files Table">
            <TableHeader>
              <TableColumn>FILE NAME</TableColumn>
              <TableColumn>FILE PATH/URL</TableColumn>
              <TableColumn width={100}>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody>
              {Object.entries(files).map(([name, url]) => (
                <TableRow key={name}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon icon={getFileIcon(url)} width={16} className="text-default-500" />
                      <span>{name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-default-500 text-sm font-mono">{url}</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      isIconOnly
                      size="sm"
                      color="danger"
                      variant="flat"
                      onPress={() => handleRemoveFile(name)}
                    >
                      <Icon icon="lucide:trash-2" width={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};