import React from "react";
import { Icon } from "@iconify/react";
import { ProductSelections } from "../stores/useStepperStore";

interface StepperProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    step: number;
    title: string;
  }>;
  selections: ProductSelections;
  onStepClick: (step: number) => void;
}

export const StepperProgress: React.FC<StepperProgressProps> = ({ currentStep, totalSteps, steps, selections, onStepClick }) => {
  const isStepAvailable = (step: number) => {
    if (step === 1) return true;
    if (step === 2) return !!selections.productGroup;
    if (step === 3) return !!selections.productRange;
    if (step === 4 || step === 5 || step === 6) return !!selections.individualProduct;
    return false;
  };

  return (
    <div className="hidden md:block mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step) => {
          const isActive = step.step === currentStep;
          const isCompleted = step.step < currentStep;
          const isAvailable = isStepAvailable(step.step);

          return (
            <React.Fragment key={step.step}>
              {/* Step indicator */}
              <div className="flex flex-col items-center relative">
                <button
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isActive ? "bg-primary text-white" : isCompleted ? "bg-success text-white" : "bg-default-100 text-default-500"
                  } ${isAvailable ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed opacity-60"}`}
                  onClick={() => isAvailable && onStepClick(step.step)}
                  disabled={!isAvailable}
                  aria-label={`Go to step ${step.step}: ${step.title}`}
                >
                  {isCompleted ? <Icon icon="lucide:check" width={20} /> : <span>{step.step}</span>}
                </button>
                <span className={`text-xs mt-2 text-center max-w-[80px] ${isActive ? "text-primary font-medium" : "text-default-500"}`}>
                  {step.title}
                </span>
              </div>

              {/* Connector line */}
              {step.step < totalSteps && (
                <div className="flex-1 h-[2px] mx-2 bg-default-200">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: isCompleted ? "100%" : "0%",
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
