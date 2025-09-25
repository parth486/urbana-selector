import React from "react";
import { ProductStepper } from "./components/ProductStepper";
import { productData as defaultProductData } from "../data/productData";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";

export default function App() {
  const [productData, setProductData] = React.useState(defaultProductData);

  return (
    <div className="min-h-screen bg-background">
      <div className="py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Product Configuration</h1>
            <p className="text-foreground-500 mt-2">Select and customize your product in a few simple steps</p>
          </div>

          <ProductStepper data={productData} />
        </div>
      </div>
    </div>
  );
}
