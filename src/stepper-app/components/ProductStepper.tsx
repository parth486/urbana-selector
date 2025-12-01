import React, { useMemo, useCallback, useEffect } from "react";
import { Card, CardBody } from "@heroui/react";
import { StepperNavigation } from "./StepperNavigation";
import { StepperProgress } from "./StepperProgress";
import { Step1ProductGroup } from "./steps/Step1ProductGroup";
import { Step2ProductRange } from "./steps/Step2ProductRange";
import { Step3IndividualProduct } from "./steps/Step3IndividualProduct";
import { Step4ProductContent } from "./steps/Step4ProductContent";
import { Step5ConfigureOptions } from "./steps/Step5ConfigureOptions";
import { Step6ContactInfo } from "./steps/Step6ContactInfo";
import { motion } from "framer-motion";
import { useStepperStore } from "../stores/useStepperStore";

// Explicitly defined the type for 'productDetails' in the relevant step data structure.
export interface ProductData {
  stepperForm: {
    steps: Array<{
      step: number;
      title: string;
      productDetails?: {
        [key: string]: any;
      }; // Explicitly defined 'productDetails' type
      options?: Record<string, { value: string; imageUrl?: string }[]>;
      productOptions?: Record<string, Record<string, { value: string; imageUrl?: string }[]>>;
      dynamicUpdates?: {
        updateImages: boolean;
        updateFiles: boolean;
      };
      [key: string]: any;
    }>;
  };
}

interface ProductStepperProps {
  data: ProductData;
}

export const ProductStepper: React.FC<ProductStepperProps> = ({ data }) => {
  const { currentStep, selections, isSubmitting, isSubmitted, updateSelection, nextStep, previousStep, goToStep, canProceedToStep } =
    useStepperStore();

  const totalSteps = data.stepperForm.steps.length;

  // Get valid options for the selected product
  const validProductOptions = useMemo(() => {
    if (!selections.individualProduct) {
      return {};
    }

    const step5Data = data.stepperForm.steps[4]; // Step 5 (index 4)
    const productOptions = step5Data?.productOptions?.[selections.individualProduct];

    if (!productOptions) {
      return {};
    }

    // Filter selections.options to only include valid option groups for this product
    const filtered: Record<string, string> = {};
    const validOptionGroups = Object.keys(productOptions);

    Object.entries(selections.options).forEach(([key, value]) => {
      if (validOptionGroups.includes(key)) {
        filtered[key] = value;
      }
    });

    return filtered;
  }, [selections.individualProduct, selections.options, data.stepperForm.steps]);

  // Debugging: log the relevant state so we can trace incorrect selections/options in QA
  useEffect(() => {
    console.log("[ProductStepper] currentStep:", currentStep);
    console.log("[ProductStepper] selections:", selections);
    console.log("[ProductStepper] stepData:", data.stepperForm.steps[currentStep - 1]);
    console.log("[ProductStepper] validProductOptions:", validProductOptions);
  }, [currentStep, selections, data.stepperForm.steps, validProductOptions]);

  const handleSubmit = useCallback(async () => {
    useStepperStore.getState().setSubmitting(true);

    try {
      // Prepare submission data with filtered options
      const submissionData = {
        productGroup: selections.productGroup,
        productRange: selections.productRange,
        individualProduct: selections.individualProduct,
        options: validProductOptions, // Use filtered options
        contactInfo: selections.contactInfo,
      };

      console.log("Submitting form data:", submissionData);
      // Make API call to submit the form
      const response = await fetch("/wp-json/urbana/v1/submit-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaPublic?.nonce || "",
        },
        body: JSON.stringify({
          selections: submissionData,
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit form");
      }

      useStepperStore.getState().setSubmitted(true);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to submit form. Please try again.");
    } finally {
      useStepperStore.getState().setSubmitting(false);
    }
  }, [selections, validProductOptions]);

  const handleGoToStep = (step: number) => {
    goToStep(step);
  };

  const handleNext = () => {
    nextStep();
  };

  const handlePrevious = () => {
    previousStep();
  };

  // Memoize the renderStep function to prevent unnecessary re-renders
  const renderStep = React.useCallback(() => {
    const stepData = data.stepperForm.steps[currentStep - 1];

    switch (currentStep) {
      case 1:
        return (
          <Step1ProductGroup
            data={{
              categories: stepData?.categories || [],
              productGroups: stepData?.productGroups || [],
            }}
            selection={selections.productGroup || null}
            onSelect={(value) => updateSelection("productGroup", value)}
          />
        );
      case 2:
        return (
          <Step2ProductRange
            data={{
              ranges: stepData?.ranges || {},
              productRanges: stepData?.productRanges || [],
              relationships: stepData?.relationships,
            }}
            productGroup={selections.productGroup || ""}
            selection={selections.productRange || null}
            onSelect={(value) => updateSelection("productRange", value)}
          />
        );
      case 3:
        return (
          <Step3IndividualProduct
            data={{
              products: stepData?.products || {},
              productsData: stepData?.productsData || [],
              relationships: stepData?.relationships,
            }}
            productRange={selections.productRange || ""}
            selection={selections.individualProduct || null}
            onSelect={(value) => updateSelection("individualProduct", value)}
          />
        );
      case 4:
        // Added fallback and additional debug logs for `productId`.
        const productId = selections.individualProduct || "unknown-product"; // Fallback value
        console.log('Step 4 Data:', stepData?.productDetails);
        console.log('Product ID:', productId);
        return (
          <Step4ProductContent
            data={{
              productDetails: stepData?.productDetails || {},
            }}
            productId={productId} // Use fallback value
          />
        );
      case 5:
        return (
          <Step5ConfigureOptions
            data={{
              options: stepData?.options || {},
              productOptions: stepData?.productOptions || {},
              dynamicUpdates: stepData?.dynamicUpdates || { updateImages: false, updateFiles: false },
            }}
            options={selections.options || {}}
            onOptionsChange={(value) => updateSelection("options", value)}
            selectedProductCode={selections.individualProduct || undefined}
          />
        );
      case 6:
        return (
          <Step6ContactInfo
            data={{
              fields: stepData?.fields || [],
            }}
            contactInfo={selections.contactInfo}
            onContactInfoChange={(info) => updateSelection("contactInfo", info)}
            isSubmitting={isSubmitting}
            isSubmitted={isSubmitted}
            onSubmit={handleSubmit}
          />
        );
      default:
        return <div>Unknown step</div>;
    }
  }, [currentStep, data.stepperForm.steps, selections, updateSelection, isSubmitting, isSubmitted, handleSubmit]);

  // Check if can proceed based on current step
  const canProceed = canProceedToStep(currentStep + 1);
  const isLastStep = currentStep === totalSteps;

  // Animation variants
  const variants = {
    hidden: { opacity: 0, x: 10 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 },
  };

  return (
    <div className="space-y-6">
      <StepperProgress
        currentStep={currentStep}
        totalSteps={totalSteps}
        steps={data.stepperForm.steps}
        selections={selections}
        onStepClick={handleGoToStep}
      />

      <Card className="shadow-sm">
        <CardBody className="p-6">
          <motion.div key={currentStep} initial="hidden" animate="visible" exit="exit" variants={variants} transition={{ duration: 0.25 }}>
            <h2 className="text-xl font-semibold mb-6">{data.stepperForm.steps[currentStep - 1].title}</h2>

            {renderStep()}
          </motion.div>
        </CardBody>
      </Card>

      <StepperNavigation
        currentStep={currentStep}
        totalSteps={totalSteps}
        onNext={handleNext}
        onPrevious={handlePrevious}
        canProceed={canProceed}
        isLastStep={isLastStep}
        isSubmitting={isSubmitting}
        isSubmitted={isSubmitted}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
