import React from "react";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface StepperNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  canProceed: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  onSubmit: () => void;
}

export const StepperNavigation: React.FC<StepperNavigationProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  canProceed,
  isLastStep,
  isSubmitting,
  isSubmitted,
  onSubmit,
}) => {
  return (
    <div className="flex justify-between items-center pt-4">
      <div>
        {currentStep > 1 && (
          <Button
            variant="flat"
            color="default"
            onPress={onPrevious}
            startContent={<Icon icon="lucide:arrow-left" width={18} />}
          >
            Previous
          </Button>
        )}
      </div>
      
      <div className="text-default-500 text-sm">
        Step {currentStep} of {totalSteps}
      </div>
      
      <div>
        {isLastStep ? (
          <Button
            color="primary"
            isDisabled={!canProceed || isSubmitting || isSubmitted}
            isLoading={isSubmitting}
            onPress={onSubmit}
            endContent={!isSubmitting && !isSubmitted && <Icon icon="lucide:send" width={18} />}
          >
            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <Icon icon="lucide:check" width={18} />
                Submitted
              </motion.div>
            ) : (
              "Submit"
            )}
          </Button>
        ) : (
          <Button
            color="primary"
            isDisabled={!canProceed}
            onPress={onNext}
            endContent={<Icon icon="lucide:arrow-right" width={18} />}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
};