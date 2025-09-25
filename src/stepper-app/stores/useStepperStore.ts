import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

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

interface StepperState {
  currentStep: number;
  selections: ProductSelections;
  isSubmitting: boolean;
  isSubmitted: boolean;

  // Actions
  setCurrentStep: (step: number) => void;
  updateSelection: (key: keyof ProductSelections, value: any) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  setSubmitting: (submitting: boolean) => void;
  setSubmitted: (submitted: boolean) => void;
  resetStepper: () => void;
  canProceedToStep: (step: number) => boolean;
}

const initialSelections: ProductSelections = {
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
};

export const useStepperStore = create<StepperState>()(
  devtools(
    persist(
      (set, get) => ({
        currentStep: 1,
        selections: initialSelections,
        isSubmitting: false,
        isSubmitted: false,

        setCurrentStep: (step) => set({ currentStep: step }),

        updateSelection: (key, value) =>
          set((state) => {
            const newSelections = { ...state.selections };

            // Reset dependent selections when parent selections change
            if (key === "productGroup") {
              newSelections.productGroup = value;
              newSelections.productRange = null;
              newSelections.individualProduct = null;
            } else if (key === "productRange") {
              newSelections.productRange = value;
              newSelections.individualProduct = null;
            } else if (key === "options") {
              newSelections.options = { ...newSelections.options, ...value };
            } else if (key === "contactInfo") {
              newSelections.contactInfo = { ...newSelections.contactInfo, ...value };
            } else {
              (newSelections as any)[key] = value;
            }

            return { selections: newSelections };
          }),

        nextStep: () =>
          set((state) => ({
            currentStep: Math.min(state.currentStep + 1, 6),
          })),

        previousStep: () =>
          set((state) => ({
            currentStep: Math.max(state.currentStep - 1, 1),
          })),

        goToStep: (step) => {
          const { selections } = get();

          // Only allow navigation to steps that are accessible based on selections
          if (
            step === 1 ||
            (step === 2 && selections.productGroup) ||
            (step === 3 && selections.productRange) ||
            (step >= 4 && selections.individualProduct)
          ) {
            set({ currentStep: step });
            return true;
          }
          return false;
        },

        setSubmitting: (submitting) => set({ isSubmitting: submitting }),
        setSubmitted: (submitted) => set({ isSubmitted: submitted }),

        resetStepper: () =>
          set({
            currentStep: 1,
            selections: initialSelections,
            isSubmitting: false,
            isSubmitted: false,
          }),

        canProceedToStep: (step) => {
          const { selections } = get();

          switch (step) {
            case 1:
              return true;
            case 2:
              return !!selections.productGroup;
            case 3:
              return !!selections.productRange;
            case 4:
            case 5:
            case 6:
              return !!selections.individualProduct;
            default:
              return false;
          }
        },
      }),
      {
        name: "urbana-stepper-storage",
        partialize: (state) => ({ selections: state.selections, currentStep: state.currentStep }),
      }
    ),
    { name: "urbana-stepper" }
  )
);
