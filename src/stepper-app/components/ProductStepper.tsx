import React from "react";
import {Card, CardBody} from "@heroui/react";
import {StepperNavigation} from "./StepperNavigation";
import {StepperProgress} from "./StepperProgress";
import {Step1ProductGroup} from "./steps/Step1ProductGroup";
import {Step2ProductRange} from "./steps/Step2ProductRange";
import {Step3IndividualProduct} from "./steps/Step3IndividualProduct";
import {Step4ProductContent} from "./steps/Step4ProductContent";
import {Step5ConfigureOptions} from "./steps/Step5ConfigureOptions";
import {Step6ContactInfo} from "./steps/Step6ContactInfo";
import {motion} from "framer-motion";

export interface ProductData {
  stepperForm: {
    steps: Array<{
      step: number;
      title: string;
      [key: string]: any;
    }>;
  };
}

export interface ProductSelections {
  productGroup: string | null;
  productRange: string | null;
  individualProduct: string | null;
  options: Record<string, string>;
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
    company: string;
    message: string;
  };
}

interface ProductStepperProps {
  data: ProductData;
}

export const ProductStepper: React.FC<ProductStepperProps> = ({data}) => {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [selections, setSelections] = React.useState<ProductSelections>({
    productGroup: null,
    productRange: null,
    individualProduct: null,
    options: {},
    contactInfo: {
      fullName: "",
      email: "",
      phone: "",
      company: "",
      message: "",
    },
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const totalSteps = data.stepperForm.steps.length;

  // Memoize the updateSelection function to prevent unnecessary re-renders
  const updateSelection = React.useCallback(
    (key: keyof ProductSelections, value: any) => {
      setSelections((prev) => {
        // If updating product group, reset dependent selections
        if (key === "productGroup") {
          return {
            ...prev,
            [key]: value,
            productRange: null,
            individualProduct: null,
          };
        }

        // If updating product range, reset individual product
        if (key === "productRange") {
          return {
            ...prev,
            [key]: value,
            individualProduct: null,
          };
        }

        return {...prev, [key]: value};
      });
    },
    []
  );

  const handleNext = React.useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  }, [currentStep, totalSteps]);

  const handlePrevious = React.useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  }, [currentStep]);

  const handleSubmit = React.useCallback(async () => {
    setIsSubmitting(true);

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSubmitted(true);
      console.log("Form submitted with data:", selections);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selections]);

  const handleGoToStep = React.useCallback(
    (step: number) => {
      // Only allow going to steps that are available based on selections
      if (step === 1) {
        setCurrentStep(step);
      } else if (step === 2 && selections.productGroup) {
        setCurrentStep(step);
      } else if (step === 3 && selections.productRange) {
        setCurrentStep(step);
      } else if (step === 4 && selections.individualProduct) {
        setCurrentStep(step);
      } else if (step === 5 && selections.individualProduct) {
        setCurrentStep(step);
      } else if (step === 6 && selections.individualProduct) {
        setCurrentStep(step);
      }

      window.scrollTo(0, 0);
    },
    [
      selections.productGroup,
      selections.productRange,
      selections.individualProduct,
    ]
  );

  // Memoize the renderStep function to prevent unnecessary re-renders
  const renderStep = React.useCallback(() => {
    const stepData = data.stepperForm.steps[currentStep - 1];

    switch (currentStep) {
      case 1:
        return (
          <Step1ProductGroup
            data={stepData}
            selection={selections.productGroup}
            onSelect={(value) => updateSelection("productGroup", value)}
          />
        );
      case 2:
        return (
          <Step2ProductRange
            data={stepData}
            productGroup={selections.productGroup!}
            selection={selections.productRange}
            onSelect={(value) => updateSelection("productRange", value)}
          />
        );
      case 3:
        return (
          <Step3IndividualProduct
            data={stepData}
            productRange={selections.productRange!}
            selection={selections.individualProduct}
            onSelect={(value) => updateSelection("individualProduct", value)}
          />
        );
      case 4:
        return (
          <Step4ProductContent
            data={stepData}
            productId={selections.individualProduct!}
          />
        );
      case 5:
        return (
          <Step5ConfigureOptions
            data={stepData}
            options={selections.options}
            onOptionsChange={(options) => updateSelection("options", options)}
          />
        );
      case 6:
        return (
          <Step6ContactInfo
            data={stepData}
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
  }, [
    currentStep,
    data.stepperForm.steps,
    selections,
    updateSelection,
    isSubmitting,
    isSubmitted,
    handleSubmit,
  ]);

  // Memoize canProceed to prevent unnecessary recalculations
  const canProceed = React.useMemo(() => {
    switch (currentStep) {
      case 1:
        return !!selections.productGroup;
      case 2:
        return !!selections.productRange;
      case 3:
        return !!selections.individualProduct;
      case 4:
        return true; // Can always proceed from viewing content
      case 5:
        return true; // Options are optional
      case 6:
        return !!(
          selections.contactInfo.fullName && selections.contactInfo.email
        );
      default:
        return false;
    }
  }, [
    currentStep,
    selections.productGroup,
    selections.productRange,
    selections.individualProduct,
    selections.contactInfo,
  ]);

  const isLastStep = currentStep === totalSteps;

  // Animation variants
  const variants = {
    hidden: {opacity: 0, x: 10},
    visible: {opacity: 1, x: 0},
    exit: {opacity: 0, x: -10},
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
          <motion.div
            key={currentStep}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={variants}
            transition={{duration: 0.25}}
          >
            <h2 className="text-xl font-semibold mb-6">
              {data.stepperForm.steps[currentStep - 1].title}
            </h2>

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
