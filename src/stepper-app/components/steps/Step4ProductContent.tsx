import { useCallback, useState, useRef, useEffect } from "react";
import { Tabs, Tab, Card, CardBody, Accordion, AccordionItem, Button, Select, SelectItem } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import SecureImage, { prefetchImage } from "../SecureImage";
import ContactModal from "../ContactModal";
import { Step6ContactInfo } from "../steps/Step6ContactInfo";
import Lightbox from "../Lightbox";

interface Step4Props {
  data: {
    productDetails: Record<string, ProductDetail>;
  };
  productId: string;
}

interface CoreDesignField {
  id: string;
  label: string;
  type: "text" | "dropdown";
  value?: string;
  values?: string[];
  defaultValue?: string;
  conditions?: Array<{ fieldId: string; value: string }>;
}

interface ProductDetail {
  name: string;
  overview: string;
  description: string;
  specifications: string[];
  imageGallery: string[];
  files: Record<string, string>;
  coreDesignElement?: CoreDesignField[];
  faqs?: Array<{ question: string; answer: string }>;
}

export const Step4ProductContent: React.FC<Step4Props> = ({ data, productId }) => {
  const productDetails = data.productDetails[productId];
  const debugMode = (window as any).urbanaDebugMode || false;

  // Sanity check imports at runtime — log if any expected component is undefined.
  useEffect(() => {
    try {
      const missing: string[] = [];
      if (!SecureImage) missing.push('SecureImage');
      if (!Lightbox) missing.push('Lightbox');
      if (!ContactModal) missing.push('ContactModal');
      if (!Icon) missing.push('Icon');
      if (missing.length > 0) {
        console.error('[Step4] Missing imports detected:', missing);
      }
    } catch (e) {
      // swallow
    }
  }, []);

  // Download handler
  const handleDownload = useCallback(async (fileUrl: string, fileName: string) => {
    try {
      // Check if this is a Digital Ocean URL that needs proxying
      const isDigitalOceanUrl = fileUrl.includes("digitaloceanspaces.com");

      let downloadUrl = fileUrl;

      if (isDigitalOceanUrl) {
        // Prefer fetching by object path rather than passing a presigned URL
        // Convert the absolute DO URL into the object key (no leading slash)
        try {
          const parsed = new URL(fileUrl);
          let objectKey = (parsed.pathname || "").replace(/^\//, "");

          // If there is an objectKey, request proxy by path so backend can use server credentials
          if (objectKey) {
            const proxyUrl = new URL("/wp-json/urbana/v1/proxy-download", window.location.origin);
            proxyUrl.searchParams.set("path", objectKey);
            downloadUrl = proxyUrl.toString();
          } else {
            // Fallback to using the full URL
            const proxyUrl = new URL("/wp-json/urbana/v1/proxy-download", window.location.origin);
            proxyUrl.searchParams.set("url", fileUrl);
            downloadUrl = proxyUrl.toString();
          }
        } catch (err) {
          // If URL parsing fails for any reason, fallback to passing the full url
          const proxyUrl = new URL("/wp-json/urbana/v1/proxy-download", window.location.origin);
          proxyUrl.searchParams.set("url", fileUrl);
          downloadUrl = proxyUrl.toString();
        }
      } else if (!/^https?:\/\//i.test(fileUrl)) {
          // If fileUrl is not an absolute URL (likely a path / filename stored in product data),
          // request the proxy to fetch by object path (backend will map to DigitalOcean Spaces)
          const proxyUrl = new URL("/wp-json/urbana/v1/proxy-download", window.location.origin);
          proxyUrl.searchParams.set("path", fileUrl);
          downloadUrl = proxyUrl.toString();
        }

      // Create a temporary anchor element and trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      link.style.display = "none";
      link.target = "_blank"; // Open in new tab as fallback

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      if (debugMode) console.error("Download failed:", error);
      alert("Failed to download file. Please try again or contact support.");
    }
  }, []);

  // Fallback for products without detailed information
  if (!productDetails) {
    return (
      <div className="text-center p-8">
        <Icon icon="lucide:file-question" className="mx-auto mb-4 text-default-400" width={48} />
        <h3 className="text-xl font-medium mb-2">Product Information Unavailable</h3>
        <p className="text-default-500">
          Detailed information for {productId} is not available at this time. Please continue to the next step or contact our support team
          for assistance.
        </p>
      </div>
    );
  }

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5 } },
  };

  const featuredImage = productDetails.imageGallery.length > 0 ? productDetails.imageGallery[0] : "";

  const galleryRef = useRef<HTMLDivElement | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [coreDesignSelections, setCoreDesignSelections] = useState<Record<string, string>>({});

  // Initialize selections with default values whenever product details change
  useEffect(() => {
    if (debugMode) console.log('[Step4] Product Details:', productDetails);
    if (debugMode && productDetails.coreDesignElement) {
      console.log('[Step4] Core Design Element Fields:', productDetails.coreDesignElement);
      productDetails.coreDesignElement.forEach((field) => {
        console.log(`[Step4] Field "${field.label}" - type: ${field.type}, defaultValue: ${field.defaultValue}, values: ${JSON.stringify(field.values)}`);
      });
    }
    
    const initialSelections: Record<string, string> = {};
    if (productDetails.coreDesignElement) {
      productDetails.coreDesignElement.forEach((field) => {
        if (field.type === 'dropdown' && field.defaultValue) {
          console.log(`[Step4] Setting default for ${field.label}: ${field.defaultValue}`);
          initialSelections[field.id] = field.defaultValue;
        }
      });
    }
    console.log('[Step4] Initial selections:', initialSelections);
    setCoreDesignSelections(initialSelections);
  }, [productDetails.coreDesignElement, debugMode]);

  const openLightboxAt = (i: number) => {
    if (debugMode) console.warn(`[Step4] openLightboxAt called with index: ${i}`);
    setLightboxIndex(i);
    setLightboxOpen(true);
  };

  // Helper function to check if a field should be visible based on conditions
  const isFieldVisible = (field: CoreDesignField): boolean => {
    if (!field.conditions || field.conditions.length === 0) {
      return true; // No conditions = always visible
    }

    // All conditions must be met (AND logic)
    return field.conditions.every((condition) => {
      const selectedValue = coreDesignSelections[condition.fieldId];
      return selectedValue === condition.value;
    });
  };

  useEffect(() => {
    if (debugMode) console.warn('[Step4] lightboxOpen state changed', { lightboxOpen, lightboxIndex });
  }, [lightboxOpen, lightboxIndex]);

  const closeLightbox = () => setLightboxOpen(false);
  const [enquireOpen, setEnquireOpen] = useState(false);
  const [enquireDiagnostic, setEnquireDiagnostic] = useState<string | null>(null);

  const openEnquire = () => {
    // User-triggered: open the enquiry modal
    try {
      if (typeof ContactModal !== 'function') {
        setEnquireDiagnostic('ContactModal is not a function - check import/export');
        try { window.__urbana_diag = window.__urbana_diag || { errors: [], events: [] }; window.__urbana_diag.events.push({ type: 'contact_modal_invalid', value: String(ContactModal) }); } catch (e) {}
        return;
      }
    } catch (err) {
      try { window.__urbana_diag = window.__urbana_diag || { errors: [], events: [] }; window.__urbana_diag.errors.push({ type: 'step4_open_enquire_error', message: String(err && err.message) }); } catch (e) {}
    }

    setEnquireDiagnostic(null);
    setEnquireOpen(true);
  };
  const closeEnquire = () => setEnquireOpen(false);

  useEffect(() => {
    if (debugMode) console.log('[Step4] useEffect mount — Step4ProductContent mounted', { galleryRefPresent: !!galleryRef.current });

    const handler = (e: MouseEvent) => {
      try {
        const gallery = galleryRef.current;
        if (!gallery) return;
        if (debugMode) console.log('[Step4 gallery container click] event', e.type, 'target:', (e.target as any)?.tagName, 'defaultPrevented', e.defaultPrevented);
        let node: Node | null = e.target as Node | null;
        // walk up looking for data-gallery-index; skip non-Element nodes
        while (node && node !== gallery) {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            node = node.parentNode;
            continue;
          }
          const el = node as HTMLElement;
          const idx = el.getAttribute?.('data-gallery-index');
          if (idx !== null && idx !== undefined) {
            if (debugMode) console.log(`[Step4 gallery container click] index found: ${idx}`);
            openLightboxAt(parseInt(idx, 10));
            return;
          }
          // inspect pointer-events style as we walk up
          const style = window.getComputedStyle(el);
          if (debugMode) console.log('[Step4 gallery container click] ancestor:', el.tagName, 'pointer-events:', style.pointerEvents);
          node = node.parentNode;
        }

        // nothing found — fallback: check bounding boxes (in case a pseudo element captured it)
        const clickX = (e as any).clientX as number;
        const clickY = (e as any).clientY as number;
        const thumbs = gallery.querySelectorAll('[data-gallery-index]');
        for (let i = 0; i < thumbs.length; i++) {
          const thumb = thumbs[i] as HTMLElement;
          const rect = thumb.getBoundingClientRect();
          if (clickX >= rect.left && clickX <= rect.right && clickY >= rect.top && clickY <= rect.bottom) {
            const idx = thumb.getAttribute('data-gallery-index');
            if (debugMode) console.log(`[Step4 gallery container click] bounding-match index: ${idx}`);
            openLightboxAt(parseInt(idx || '0', 10));
            return;
          }
        }
      } catch (err) {
        console.error('Gallery handler error', err);
      }
    };

    // use capture to detect clicks early
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [galleryRef, openLightboxAt, debugMode]);

  return (
    <motion.div className="space-y-8" initial="hidden" animate="show" variants={fadeIn}>
      {/* Product header */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/2">
          {featuredImage ? (
            <div data-gallery-index={0} className="cursor-pointer" onClick={() => { if (debugMode) console.log('[Step4] featured image clicked index: 0'); openLightboxAt(0); }} onMouseEnter={() => { prefetchImage(featuredImage, productId).catch(()=>{}); }}>
                <SecureImage
                  imagePath={featuredImage}
                  productCode={productId}
                  alt={productDetails.name}
                  className="w-full h-64 object-cover rounded-medium"
                  onClick={() => openLightboxAt(0)}
                  loading="eager"
                  fetchPriority="high"
                />
            </div>
          ) : (
            <div className="w-full h-64 bg-gray-100 rounded-medium flex items-center justify-center">
              <Icon icon="lucide:image" width={48} className="text-gray-400" />
            </div>
          )}
        </div>

        <div className="w-full md:w-1/2">
          <h3 className="text-xl font-semibold mb-2">{productDetails.name}</h3>
          <p className="text-default-600 mb-4">{productDetails.overview}</p>

          {/* Core Design Elements Section */}
          {productDetails.coreDesignElement && productDetails.coreDesignElement.length > 0 ? (
            <div className="space-y-5">
              <div className="space-y-4">
                {productDetails.coreDesignElement.map((field) => (
                  isFieldVisible(field) && (
                    <div key={field.id}>
                      {field.type === 'text' ? (
                        <div>
                          <span className="font-semibold">{field.label}:</span>
                          <span className="ml-2">{field.value}</span>
                        </div>
                      ) : field.type === 'dropdown' ? (
                        <div>
                          <label className="text-sm font-medium mb-2 block">{field.label}</label>
                          <Select
                            selectedKeys={coreDesignSelections[field.id] ? [coreDesignSelections[field.id]] : []}
                            onSelectionChange={(keys) => {
                              const selectedValue = Array.from(keys)[0] as string;
                              setCoreDesignSelections({ ...coreDesignSelections, [field.id]: selectedValue });
                            }}
                            placeholder={`Select ${field.label}`}
                            size="sm"
                            className="w-full"
                          >
                            {field.values?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                      ) : null}
                    </div>
                  )
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Icon icon="lucide:check-circle" className="text-success" width={20} />
                <span>In Stock</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon icon="lucide:truck" className="text-default-500" width={20} />
                <span>Standard Delivery: 2-4 weeks</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon icon="lucide:shield" className="text-default-500" width={20} />
                <span>10 Year Warranty</span>
              </div>
            </div>
          )}

          <div className="mt-4">
            <Button
              color="primary"
              size="md"
              onPress={openEnquire}
              endContent={<Icon icon="lucide:arrow-right" width={18} />}
              aria-label="Enquire Now"
            >
              Enquire Now
            </Button>
          </div>
        </div>
      </div>

      {(() => {
        if (!enquireOpen) return null;

        // Defensive check: React will throw a runtime error if the element type is invalid
        // (e.g. undefined, null, or a non-component object). Detect and render a helpful
        // diagnostic UI here instead of letting React throw a minified exception.
        try {
          if (ContactModal == null || (typeof ContactModal !== 'function' && typeof ContactModal !== 'object')) {
            console.error('[Step4] ContactModal invalid at render', ContactModal);
            // Record diagnostic for server-side or global inspection
            try { window.__urbana_diag = window.__urbana_diag || { errors: [] }; window.__urbana_diag.errors.push({ type: 'contact_modal_invalid', value: String(ContactModal) }); } catch {}
            return (
              <div className="p-4 bg-warning/5 border border-warning/10 rounded-medium">
                <h4 className="font-semibold mb-2">Enquiry form failed to open</h4>
                <p className="text-sm text-default-600">The enquiry form component is not available. This is likely a build/import issue. See the console for diagnostic details.</p>
                <pre className="text-xs mt-2">{JSON.stringify({ ContactModal: String(ContactModal), typeofContactModal: typeof ContactModal }, null, 2)}</pre>
              </div>
            );
          }

          return <ContactModal open={enquireOpen} onClose={closeEnquire} />;
        } catch (err: any) {
          console.error('[Step4] Error mounting ContactModal', err, err && err.stack);
          try { window.__urbana_diag = window.__urbana_diag || { errors: [] }; window.__urbana_diag.errors.push({ type: 'contact_modal_mount_error', message: String(err && err.message), stack: err && err.stack }); } catch {}
          return (
            <div className="p-4 bg-warning/5 border border-warning/10 rounded-medium">
              <h4 className="font-semibold mb-2">Enquiry form failed to open</h4>
              <p className="text-sm text-default-600">An error occurred while opening the enquiry form. See console for details.</p>
              <pre className="text-xs mt-2">{String(err && err.message)}</pre>
            </div>
          );
        }
      })()}

      {/* Product content tabs */}
      <Tabs aria-label="Product information tabs" variant="underlined" color="primary">
        <Tab key="details" title="Details">
          <Card>
            <CardBody className="p-6">
              <div className="prose max-w-none">
                <p className="text-default-700">{productDetails.description}</p>

                <h4 className="text-lg font-medium mt-6 mb-3">Specifications</h4>
                <ul className="space-y-2">
                  {productDetails.specifications.map((spec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Icon icon="lucide:chevron-right" className="text-primary mt-1 flex-shrink-0" width={16} />
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardBody>
          </Card>
        </Tab>

        <Tab key="gallery" title="Image Gallery">
          <Card>
            <CardBody className="p-6">
              <div ref={galleryRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {productDetails.imageGallery.map((image, index) => (
                  <div key={index} data-gallery-index={index} className="aspect-square cursor-pointer pointer-events-auto" onClick={(e) => { if (debugMode) console.log(`[Step4 wrapper click] index: ${index}`); e.stopPropagation(); openLightboxAt(index); }} onMouseEnter={() => { prefetchImage(image, productId).catch(()=>{}); }}>
                    <SecureImage
                      imagePath={image}
                      productCode={productId}
                      alt={`${productDetails.name} - Image ${index + 1}`}
                      className="w-full h-full object-cover rounded-medium"
                      onClick={() => openLightboxAt(index)}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </Tab>

        {/* Lightbox overlay (moved out of Tabs to ensure it's always rendered) */}

        <Tab key="files" title="Downloads">
          <Card>
            <CardBody className="p-6">
              <div className="space-y-4">
                <p className="text-default-600 mb-4">Download product documentation and technical files:</p>

                <div className="space-y-3">
                  {Object.entries(productDetails.files).map(([name, fileUrl]) => (
                    <div
                      key={fileUrl}
                      className="flex items-center justify-between p-3 border border-default-200 rounded-medium hover:border-primary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-default-100 rounded-medium">
                          <Icon icon={getFileIcon(fileUrl)} className="text-default-600" width={20} />
                        </div>
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-xs text-default-500">{getFileSize(fileUrl)}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        onPress={() => handleDownload(fileUrl, getFileNameFromUrl(fileUrl, name))}
                        endContent={<Icon icon="lucide:download" width={16} />}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </Tab>

        <Tab key="faq" title="FAQ">
          <Card>
            <CardBody className="p-6">
                      <Accordion>
                        {
                          // If this product has its own FAQ array, render those. Otherwise fall back to the default hard-coded entries.
                          (productDetails.faqs && productDetails.faqs.length > 0
                            ? productDetails.faqs.map((f, i) => (
                                <AccordionItem key={i} title={f.question}>
                                  {f.answer}
                                </AccordionItem>
                              ))
                            : [
                                {
                                  q: "What is the installation process?",
                                  a:
                                    "Installation typically requires a concrete foundation and can be completed by our certified installers. The process usually takes 1-3 days depending on the product complexity and site conditions.",
                                },
                                {
                                  q: "What maintenance is required?",
                                  a:
                                    "Our products are designed for minimal maintenance. We recommend a visual inspection every 6 months and cleaning as needed. Specific maintenance schedules are provided in the product documentation.",
                                },
                                {
                                  q: "Are customizations available?",
                                  a:
                                    "Yes, most products can be customized with different colors, materials, and additional features. Custom options can be selected in the next step of this configuration process.",
                                },
                                {
                                  q: "What warranty is provided?",
                                  a:
                                    "Standard warranty is 10 years on structural components and 5 years on other elements. Extended warranties are available for purchase. All warranties cover manufacturing defects and normal wear.",
                                },
                              ].map((item, i) => (
                                <AccordionItem key={`fallback-${i}`} title={item.q}>
                                  {item.a}
                                </AccordionItem>
                              )))
                        }
                      </Accordion>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>

      {/* Ensure Lightbox is rendered outside of Tabs so it's mounted regardless of active Tab */}
      <Lightbox
        images={productDetails.imageGallery}
        productCode={productId}
        open={lightboxOpen}
        initialIndex={lightboxIndex}
        onClose={closeLightbox}
      />
    </motion.div>
  );
};

// Helper functions
function getImageCategory(productId: string): string {
  // Determine image category based on product ID prefix
  const prefix = productId.charAt(0);

  const mapping: Record<string, string> = {
    K: "landscape", // Peninsula shelters
    W: "landscape", // Whyalla shelters
    C: "landscape", // Coastal shelters
    U: "landscape", // Urban shelters
    H: "landscape", // Heritage shelters
    E: "places", // EcoSan toilets
    S: "places", // Standard toilets
    A: "places", // Accessible toilets
    P: "places", // Premium toilets
    SS: "landscape", // Small Span bridges
    LS: "landscape", // Large Span bridges
    R: "places", // Ramps
    ST: "places", // Staircases
    B: "furniture", // Benches
    TS: "furniture", // Table Settings
    SL: "places", // Solar lighting
    MP: "places", // Mains Powered lighting
  };

  // Default to places if no specific mapping
  return mapping[prefix] || "places";
}

function getFileIcon(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();

  const iconMap: Record<string, string> = {
    pdf: "lucide:file-text",
    dwg: "lucide:file-cog",
    rvt: "lucide:file-3d",
    doc: "lucide:file-text",
    docx: "lucide:file-text",
    xls: "lucide:file-spreadsheet",
    xlsx: "lucide:file-spreadsheet",
    zip: "lucide:file-archive",
    default: "lucide:file",
  };

  return iconMap[extension || ""] || iconMap["default"];
}

function getFileSize(filename: string): string {
  // Simulate file sizes based on file type
  const extension = filename.split(".").pop()?.toLowerCase();

  const sizes: Record<string, string> = {
    pdf: "2.4 MB",
    dwg: "5.8 MB",
    rvt: "12.6 MB",
    doc: "1.2 MB",
    docx: "1.5 MB",
    xls: "3.1 MB",
    xlsx: "3.4 MB",
    zip: "8.7 MB",
    default: "1.0 MB",
  };

  return sizes[extension || ""] || sizes["default"];
}

function getFileNameFromUrl(url: string, displayName: string): string {
  // Try to extract filename from URL
  try {
    let filename = "";

    // Prefer using the URL API so we ignore query strings / fragments
    try {
      const parsed = new URL(url);
      filename = (parsed.pathname || "").split("/").pop() || "";
    } catch (err) {
      // Not a full absolute URL, fallback to a simple split
      const urlParts = url.split("/");
      filename = urlParts[urlParts.length - 1] || "";
    }

    // Strip any query string or fragment that may still be present
    filename = filename.split("?")[0].split("#")[0];

    // If we got a valid filename with extension, use it
    if (filename && filename.includes(".")) {
      return decodeURIComponent(filename);
    }
  } catch (error) {
    if (debugMode) console.error("Error extracting filename from URL:", error);
  }

  // Fallback: use display name and try to add extension from URL
  // Try to extract extension from the URL but ignore query strings/fragments
  const extension = (url.split(".").pop() || "").toLowerCase().split("?")[0].split("#")[0];
  if (extension && !displayName.includes(".")) {
    return `${displayName}.${extension}`;
  }

  return displayName;
}
