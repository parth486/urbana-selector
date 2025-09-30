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

interface ProductData {
  id: number;
  stepperForm: {
    steps: Array<{
      step: number;
      title: string;
      [key: string]: any;
    }>;
  };
}

interface StepperState {
  productData: ProductData | null;
  currentStep: number;
  selections: ProductSelections;
  isSubmitting: boolean;
  isSubmitted: boolean;

  // Actions
  setCurrentStep: (step: number) => void;
  setProductData: (data: ProductData) => void;
  updateSelection: (key: keyof ProductSelections, value: any) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  setSubmitting: (submitting: boolean) => void;
  setSubmitted: (submitted: boolean) => void;
  resetStepper: () => void;
  canProceedToStep: (step: number) => boolean;
  initializeProductData: () => void;
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
        productData: null,
        currentStep: 1,
        selections: initialSelections,
        isSubmitting: false,
        isSubmitted: false,

        initializeProductData: () => {
          const windowData = (window as any).urbanaPublic;

          if (windowData?.productData) {
            console.log("Initializing stepper with database product data");
            set({
              productData: windowData.productData,
            });
          } else {
            console.warn("No database product data found in window.urbanaPublic");
          }
        },

        // Set product data directly
        setProductData: (data: ProductData) => {
          set({ productData: data });
        },

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

        goToStep: (step: number) => {
          const { selections, productData } = get();
          const maxSteps = productData?.stepperForm?.steps?.length || 6;

          // Validate step number
          if (step < 1 || step > maxSteps) {
            return false;
          }

          // Check if step is accessible based on selections
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

        // Check if can proceed to a specific step
        canProceedToStep: (step: number) => {
          const { selections, productData } = get();
          const maxSteps = productData?.stepperForm?.steps?.length || 6;

          if (step > maxSteps) return false;

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
