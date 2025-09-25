import React from "react";
import { Input, Textarea, Checkbox, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface Step6Props {
  data: {
    fields: Array<{
      name: string;
      label: string;
      type: string;
      required: boolean;
    }>;
  };
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
    company: string;
    message: string;
  };
  onContactInfoChange: (info: any) => void;
  isSubmitting: boolean;
  isSubmitted: boolean;
  onSubmit: () => void;
}

export const Step6ContactInfo: React.FC<Step6Props> = ({
  data,
  contactInfo,
  onContactInfoChange,
  isSubmitting,
  isSubmitted,
  onSubmit,
}) => {
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    onContactInfoChange({
      ...contactInfo,
      [field]: value,
    });
    
    // Clear error when field is edited
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: "",
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate required fields
    if (!contactInfo.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    
    if (!contactInfo.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(contactInfo.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!acceptTerms) {
      newErrors.terms = "You must accept the terms and conditions";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit();
    }
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isSubmitted) {
    return (
      <motion.div 
        className="text-center py-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon icon="lucide:check" className="text-success" width={32} />
        </div>
        <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
        <p className="text-default-600 max-w-md mx-auto mb-6">
          Your product configuration has been submitted successfully. Our team will review your selections
          and contact you shortly with pricing and next steps.
        </p>
        <div className="border border-default-200 rounded-medium p-4 max-w-md mx-auto text-left">
          <h4 className="font-medium mb-2">Your Reference Number</h4>
          <p className="text-primary font-mono text-lg">REF-{Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.p variants={item} className="text-default-600">
        Please provide your contact information to receive a detailed quote for your configured product.
      </motion.p>
      
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Full Name"
          placeholder="Enter your full name"
          value={contactInfo.fullName}
          onValueChange={(value) => handleInputChange("fullName", value)}
          isRequired
          isInvalid={!!errors.fullName}
          errorMessage={errors.fullName}
        />
        
        <Input
          label="Email Address"
          placeholder="Enter your email address"
          type="email"
          value={contactInfo.email}
          onValueChange={(value) => handleInputChange("email", value)}
          isRequired
          isInvalid={!!errors.email}
          errorMessage={errors.email}
        />
      </motion.div>
      
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Phone Number"
          placeholder="Enter your phone number"
          type="tel"
          value={contactInfo.phone}
          onValueChange={(value) => handleInputChange("phone", value)}
        />
        
        <Input
          label="Company/Organization"
          placeholder="Enter your company or organization"
          value={contactInfo.company}
          onValueChange={(value) => handleInputChange("company", value)}
        />
      </motion.div>
      
      <motion.div variants={item}>
        <Textarea
          label="Additional Notes"
          placeholder="Enter any specific requirements or questions"
          value={contactInfo.message}
          onValueChange={(value) => handleInputChange("message", value)}
          minRows={3}
        />
      </motion.div>
      
      <motion.div variants={item} className="space-y-4">
        <Checkbox
          isSelected={acceptTerms}
          onValueChange={setAcceptTerms}
          isInvalid={!!errors.terms}
        >
          <div className="flex flex-col">
            <span>I agree to the Terms and Conditions and Privacy Policy</span>
            {errors.terms && (
              <span className="text-danger text-xs mt-1">{errors.terms}</span>
            )}
          </div>
        </Checkbox>
        
        <div className="bg-default-50 p-4 rounded-medium text-sm text-default-600">
          <p className="flex items-start gap-2">
            <Icon icon="lucide:shield" className="text-default-500 mt-0.5 flex-shrink-0" width={16} />
            <span>
              Your information is secure and will only be used to process your product inquiry.
              We will never share your details with third parties without your consent.
            </span>
          </p>
        </div>
      </motion.div>
      
      <motion.div variants={item} className="pt-4">
        <Button
          color="primary"
          size="lg"
          className="w-full md:w-auto"
          isDisabled={isSubmitting}
          isLoading={isSubmitting}
          onPress={handleSubmit}
          endContent={!isSubmitting && <Icon icon="lucide:send" width={18} />}
        >
          Submit Configuration
        </Button>
      </motion.div>
    </motion.div>
  );
};