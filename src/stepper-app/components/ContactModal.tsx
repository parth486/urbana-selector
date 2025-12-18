import React from 'react';
import { Icon } from '@iconify/react';
import { Button, Input, Textarea, Checkbox } from '@heroui/react';
import { Step6ContactInfo } from './steps/Step6ContactInfo';

import { useStepperStore } from '../stores/useStepperStore';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ open, onClose }) => {
  // Diagnostic: component type checks (no console logging in production)
  try {
    // Intentionally left blank: previous console logs removed.
  } catch (e) {}

  const productData = useStepperStore((s) => s.productData);
  const selections = useStepperStore((s) => s.selections);
  const setSubmitting = useStepperStore((s) => s.setSubmitting);
  const setSubmitted = useStepperStore((s) => s.setSubmitted);
  const updateSelection = useStepperStore((s) => s.updateSelection);

  const [contactInfo, setContactInfo] = React.useState(() => ({ ...selections.contactInfo }));
  const [isSubmitting, setIsSubmittingLocal] = React.useState(false);
  const [isSubmittedLocal, setIsSubmittedLocal] = React.useState(false);
  const [lastSubmitResult, setLastSubmitResult] = React.useState<any>(null);

  React.useEffect(() => {
    // reset when opened
    if (open) {
      // Clear any previously pasted long message when opening modal to avoid unexpected prefill
      setContactInfo({ ...selections.contactInfo, message: '' });
      setIsSubmittedLocal(false);
    }
  }, [open, selections.contactInfo]);

  const formFields = productData?.stepperForm?.steps?.[5]?.fields || [];

  const handleContactChange = (info: any) => {
    setContactInfo(info);
  };

  // Sanity check: ensure Step6ContactInfo is available
  React.useEffect(() => {
    try {
      // debug info captured via __urbana_diag if needed; no console output.
      if (!Step6ContactInfo) {
        try { window.__urbana_diag = window.__urbana_diag || { errors: [], events: [] }; window.__urbana_diag.events.push({ type: 'missing_step6_component', timestamp: new Date().toISOString() }); } catch (e) {}
      }
    } catch (e) {}
  }, []);

  const handleSubmit = async () => {
    try {
      setIsSubmittingLocal(true);
      setSubmitting(true);

      // Prepare submission data same as ProductStepper
      const submissionData = {
        productGroup: selections.productGroup,
        productRange: selections.productRange,
        individualProduct: selections.individualProduct,
        options: selections.options,
        contactInfo: contactInfo,
      };

      const resp = await fetch('/wp-json/urbana/v1/submit-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': (window as any).urbanaPublic?.nonce || '',
        },
        body: JSON.stringify({ selections: submissionData, submittedAt: new Date().toISOString() }),
      });

      // Parse response body for diagnostics (always attempt to capture body)
      let respBody: any = null;
      try {
        respBody = await resp.json();
      } catch (e1) {
        try {
          respBody = await resp.text();
        } catch (e2) {
          respBody = null;
        }
      }

  // Record in diagnostics store (no console output in production)
  try {
    window.__urbana_diag = window.__urbana_diag || { errors: [], events: [] };
    window.__urbana_diag.events.push({ type: 'submit_response', timestamp: new Date().toISOString(), status: resp.status, body: respBody });
  } catch (e) {}

      setIsSubmittedLocal(true);
      setSubmitted(true);
      // keep modal open and show success state, allow user to close explicitly
    } catch (err) {
      console.error('Failed to submit enquiry', err);
      alert('Failed to submit enquiry. Please try again.');
    } finally {
      setIsSubmittingLocal(false);
      setSubmitting(false);
    }
  };

  if (!open) return null;
  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);

  // Focus the Close button once submitted
  React.useEffect(() => {
    if (isSubmittedLocal && closeBtnRef.current) {
      try {
        closeBtnRef.current.focus();
      } catch (e) {}
    }
  }, [isSubmittedLocal, lastSubmitResult]);

  // Lifecycle mount/unmount diagnostic (no console logs)
  React.useEffect(() => {
    try { window.__urbana_diag = window.__urbana_diag || { errors: [], events: [] }; window.__urbana_diag.events.push({ type: 'contact_modal_mount', timestamp: new Date().toISOString(), open: open }); } catch (e) {}
    return () => {
      try { window.__urbana_diag.events.push({ type: 'contact_modal_unmount', timestamp: new Date().toISOString() }); } catch (e) {}
    };
  }, []);

  // If submission succeeded, show a dedicated success UI here to avoid relying
  // on the embedded form to switch to its success state (helps when that
  // component doesn't update for any reason).
  if (isSubmittedLocal) {
    try {
      window.__urbana_diag = window.__urbana_diag || { errors: [], events: [] };
      window.__urbana_diag.events.push({ type: 'submit_ui_shown', timestamp: new Date().toISOString(), status: lastSubmitResult?.status ?? null });
    } catch {}

    return (
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
        <div className="relative w-full max-w-2xl bg-white rounded-medium shadow-lg z-10 p-6 max-h-[85vh] overflow-auto">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon icon="lucide:check" className="text-success" width={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
            <p className="text-default-600 max-w-md mx-auto mb-6">
              Your enquiry has been submitted successfully.
              {lastSubmitResult?.body?.id ? (
                <span> Reference: {String(lastSubmitResult.body.id)}</span>
              ) : null}
            </p>

            {lastSubmitResult && (
              <div className="mt-4 p-3 bg-default-50 rounded text-xs text-default-600">
                <strong>Server response:</strong>
                <div>Status: {String(lastSubmitResult.status)}</div>
                <pre className="mt-2 text-xs whitespace-pre-wrap">{typeof lastSubmitResult.body === 'string' ? lastSubmitResult.body : JSON.stringify(lastSubmitResult.body, null, 2)}</pre>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button ref={closeBtnRef} color="primary" onPress={onClose} aria-label="Close enquiry dialog">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/60" onClick={isSubmittedLocal ? onClose : undefined} aria-hidden="true" />
      <div className="relative w-full max-w-2xl bg-white rounded-medium shadow-lg z-10 p-6 max-h-[85vh] overflow-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold">Enquire about this product</h3>
            <p className="text-sm text-default-500">Leave your contact details and we will get back to you with pricing and next steps.</p>
          </div>
            <div className="flex items-center gap-2">
              <Button variant="flat" color="default" onPress={() => setContactInfo({ fullName: '', email: '', phone: '', company: '', message: '' })} aria-label="Clear enquiry form">
                Clear
              </Button>
              <Button variant="flat" color="default" onPress={onClose} aria-label="Close enquiry dialog">
                <Icon icon="lucide:x" width={18} />
              </Button>
            </div>
        </div>

        <div>
          {(() => {
            if (typeof Step6ContactInfo !== 'function') {
              return (
                <div className="p-4 bg-warning/5 border border-warning/10 rounded-medium">
                  <h4 className="font-semibold mb-2">Error loading enquiry form</h4>
                  <p className="text-sm text-default-600">The contact form component could not be rendered. This is likely a build/import issue. See the console for diagnostic details.</p>
                  <pre className="text-xs mt-2">{JSON.stringify({ Step6ContactInfo: typeof Step6ContactInfo, Input: typeof Input, Textarea: typeof Textarea, Checkbox: typeof Checkbox, Button: typeof Button }, null, 2)}</pre>
                </div>
              );
            }

            try {
              return (
                <Step6ContactInfo
                  data={{ fields: formFields }}
                  contactInfo={contactInfo}
                  onContactInfoChange={(info) => handleContactChange(info)}
                  isSubmitting={isSubmitting}
                  isSubmitted={isSubmittedLocal}
                  onSubmit={handleSubmit}
                  submitLabel="Enquire Now"
                  maxMessageLength={2000}
                />
              );
            } catch (err: any) {
              try { window.__urbana_diag = window.__urbana_diag || { errors: [], events: [] }; window.__urbana_diag.errors.push({ type: 'render_error_step6', message: String(err && err.message), stack: err && err.stack }); } catch (e) {}
              return (
                <div className="p-4 bg-warning/5 border border-warning/10 rounded-medium">
                  <h4 className="font-semibold mb-2">Error rendering enquiry form</h4>
                  <p className="text-sm text-default-600">An unexpected error occurred while rendering the form. See diagnostics for details.</p>
                  <pre className="text-xs mt-2">{String(err && err.message)}</pre>
                </div>
              );
            }
          })()}
        </div>

        {/* Last submit diagnostic (visible for debugging) */}
        {lastSubmitResult && (
          <div className="mt-4 p-3 bg-default-50 rounded text-xs text-default-600">
            <strong>Last submission:</strong>
            <div>Status: {String(lastSubmitResult.status)}</div>
            <pre className="mt-2 text-xs whitespace-pre-wrap">{typeof lastSubmitResult.body === 'string' ? lastSubmitResult.body : JSON.stringify(lastSubmitResult.body, null, 2)}</pre>
          </div>
        )}

        {/* Footer actions: on success show Close CTA */}
        {isSubmittedLocal && (
          <div className="mt-6 flex justify-end">
            <Button ref={closeBtnRef} color="primary" onPress={onClose} aria-label="Close enquiry dialog">
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactModal;
