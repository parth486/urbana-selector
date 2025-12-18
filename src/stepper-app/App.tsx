import { useState, useEffect } from "react";
import { ProductStepper } from "./components/ProductStepper";
import { productData as defaultProductData } from "../data/productData";
import { Button, Spinner, Alert } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useStepperStore } from "./stores/useStepperStore";

export default function App() {
  const { productData, initializeProductData } = useStepperStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debugMode = (window as any).urbanaDebugMode || false;

  // Initialize product data from window object on mount
  useEffect(() => {
    try {
      const windowData = (window as any).urbanaPublic;

      if (windowData?.productData) {
        if (debugMode) console.log("Loading product data from database:", windowData.productData);
        initializeProductData();
        setError(null);
      } else {
        if (debugMode) console.warn("No product data found in window.urbanaPublic, using default data");
        // Fallback to default data if no database data available
        useStepperStore.getState().setProductData(defaultProductData);
        setError("Using default product data - database may be empty");
      }
    } catch (err) {
      if (debugMode) console.error("Error initializing product data:", err);
      setError("Failed to load product data");
      // Fallback to default data on error
      useStepperStore.getState().setProductData(defaultProductData);
    } finally {
      setIsLoading(false);
    }
  }, [initializeProductData]);

  // Show loading spinner while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-foreground-600">Loading product configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if no product data available
  if (!productData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="py-12 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <Alert
              color="danger"
              variant="flat"
              className="mb-6"
              title="Configuration Error"
              description="Unable to load product configuration data. Please contact support."
              startContent={<Icon icon="lucide:alert-triangle" width={20} />}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Product Configuration</h1>
            <p className="text-foreground-500 mt-2">Select and customize your product in a few simple steps</p>
          </div>

          {/* Development Warning */}
          {error && (
            <Alert
              color="warning"
              variant="flat"
              className="mb-6"
              title="Development Notice"
              description={error}
              startContent={<Icon icon="lucide:info" width={20} />}
            />
          )}

          {/* Main Stepper */}
          <ProductStepper data={productData} />
        </div>
      </div>
    </div>
  );
}
