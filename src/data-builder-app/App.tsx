import React from "react";
import {DataBuilder} from "../data-builder-app/components/data-builder/DataBuilder";
import {productData as defaultProductData} from "../data/productData";
import {Button} from "@heroui/react";
import {Icon} from "@iconify/react";

export default function App() {
  const [showBuilder, setShowBuilder] = React.useState(false);
  const [productData, setProductData] = React.useState(defaultProductData);

  const handleDataUpdate = (newData: any) => {
    setProductData(newData);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="py-6 px-4 sm:px-6">
        <DataBuilder
          initialData={productData}
          onDataUpdate={handleDataUpdate}
        />
      </div>
    </div>
  );
}
