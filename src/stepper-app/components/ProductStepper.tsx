import React from "react";
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

export interface ProductData {
  stepperForm: {
    steps: Array<{
      step: number;
      title: string;
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

  const handleSubmit = async () => {
    useStepperStore.getState().setSubmitting(true);

    try {
      // Make API call to submit the form
      const response = await fetch("/wp-json/urbana/v1/submit-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).urbanaPublic?.nonce || "",
        },
        body: JSON.stringify({
          selections,
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
  };

  const handleGoToStep = (step: number) => {
    goToStep(step);
    window.scrollTo(0, 0);
  };

  const handleNext = () => {
    nextStep();
    window.scrollTo(0, 0);
  };

  const handlePrevious = () => {
    previousStep();
    window.scrollTo(0, 0);
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
            }}
            productRange={selections.productRange || ""}
            selection={selections.individualProduct || null}
            onSelect={(value) => updateSelection("individualProduct", value)}
          />
        );
      case 4:
        return (
          <Step4ProductContent
            data={{
              productDetails: stepData?.productDetails || {},
            }}
            productId={selections.individualProduct!}
          />
        );
      case 5:
        return (
          <Step5ConfigureOptions
            data={{
              options: stepData?.options || {},
              dynamicUpdates: stepData?.dynamicUpdates || { updateImages: false, updateFiles: false },
            }}
            options={selections.options || {}}
            onOptionsChange={(value) => updateSelection("options", value)}
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
