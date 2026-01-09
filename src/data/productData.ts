export const productData = {
  stepperForm: {
    steps: [
      {
        step: 1,
        title: "Select Product Group",
        categories: ["Shelter", "Toilet", "Bridge", "Access", "Seating", "Lighting"],
      },
      {
        step: 2,
        title: "Select Product Range",
        ranges: {
          Shelter: ["Peninsula", "Whyalla", "Coastal", "Urban", "Heritage"],
          Toilet: ["EcoSan", "Standard", "Accessible", "Premium", "Compact"],
          Bridge: ["Small Span", "Large Span", "Pedestrian", "Decorative", "Heavy Duty"],
          Access: ["Ramp", "Staircase", "Pathway", "Boardwalk", "Platform"],
          Seating: ["Bench", "Table Setting", "Lounge", "Stadium", "Custom"],
          Lighting: ["Solar", "Mains Powered", "Decorative", "Security", "Pathway"],
        },
      },
      {
        step: 3,
        title: "Select Individual Product",
        products: {
          Peninsula: ["K301", "K302", "K308", "K310", "K315"],
          Whyalla: ["W101", "W102", "W105", "W110", "W120"],
          Coastal: ["C201", "C202", "C205", "C210", "C215"],
          Urban: ["U301", "U302", "U305", "U310", "U315"],
          Heritage: ["H401", "H402", "H405", "H410", "H415"],
          EcoSan: ["E201", "E202", "E205", "E210", "E215"],
          Standard: ["S301", "S302", "S305", "S310", "S315"],
          Accessible: ["A401", "A402", "A405", "A410", "A415"],
          Premium: ["P501", "P502", "P505", "P510", "P515"],
          Compact: ["C601", "C602", "C605", "C610", "C615"],
          "Small Span": ["SS101", "SS102", "SS105", "SS110", "SS115"],
          "Large Span": ["LS201", "LS202", "LS205", "LS210", "LS215"],
          Pedestrian: ["PB301", "PB302", "PB305", "PB310", "PB315"],
          Decorative: ["DB401", "DB402", "DB405", "DB410", "DB415"],
          "Heavy Duty": ["HD501", "HD502", "HD505", "HD510", "HD515"],
          Ramp: ["R101", "R102", "R105", "R110", "R115"],
          Staircase: ["ST201", "ST202", "ST205", "ST210", "ST215"],
          Pathway: ["PW301", "PW302", "PW305", "PW310", "PW315"],
          Boardwalk: ["BW401", "BW402", "BW405", "BW410", "BW415"],
          Platform: ["PL501", "PL502", "PL505", "PL510", "PL515"],
          Bench: ["B101", "B102", "B105", "B110", "B115"],
          "Table Setting": ["TS201", "TS202", "TS205", "TS210", "TS215"],
          Lounge: ["L301", "L302", "L305", "L310", "L315"],
          Stadium: ["SD401", "SD402", "SD405", "SD410", "SD415"],
          Custom: ["CS501", "CS502", "CS505", "CS510", "CS515"],
          Solar: ["SL101", "SL102", "SL105", "SL110", "SL115"],
          "Mains Powered": ["MP201", "MP202", "MP205", "MP210", "MP215"],
          Security: ["SC401", "SC402", "SC405", "SC410", "SC415"],
        },
      },
      {
        step: 4,
        title: "View Product Content",
        productDetails: {
          K301: {
            name: "Peninsula K301",
            overview: "Compact shelter suitable for parks and gardens with durable construction and weather resistance.",
            description:
              "The Peninsula K301 is our most popular compact shelter, designed for parks and urban settings. It features a modern design with excellent weather protection and durability. The structure is engineered to withstand harsh conditions while providing a comfortable space for visitors.",
            specifications: ["Dimensions: 3.0m x 3.0m", "Height: 2.5m", "Capacity: 8-10 people", "Weight: 450kg"],
            imageGallery: ["shelter/1", "shelter/2", "shelter/3"],
            files: {
              "PDF Specification": "Peninsula_K301_Spec.pdf",
              "Installation Guide": "Peninsula_K301_Install.pdf",
              "Revit Model": "Peninsula_K301.rvt",
              "CAD Drawing": "Peninsula_K301.dwg",
            },
            coreDesignElement: [],
            faqs: [
              {
                question: "What is the recommended maintenance schedule for the K301?",
                answer: "We recommend a visual inspection every 6 months and a more detailed maintenance check annually to ensure structural integrity and finish longevity.",
              },
              {
                question: "Can the K301 be fitted with solar lighting?",
                answer: "Yes, the K301 supports retrofit solar lighting kits in the roof panel; select the 'Solar Panels' roof option during configuration.",
              },
            ],
          },
          K302: {
            name: "Peninsula K302",
            overview: "Medium-sized shelter ideal for picnic areas and playgrounds with extended roof coverage.",
            description:
              "The Peninsula K302 is a versatile medium-sized shelter perfect for picnic areas and playgrounds. It offers extended roof coverage and can be configured with various seating options. The design emphasizes both aesthetics and functionality, making it a popular choice for public spaces.",
            specifications: ["Dimensions: 4.0m x 4.0m", "Height: 2.8m", "Capacity: 12-15 people", "Weight: 580kg"],
            imageGallery: ["shelter/4", "shelter/5", "shelter/6"],
            files: {
              "PDF Specification": "Peninsula_K302_Spec.pdf",
              "Installation Guide": "Peninsula_K302_Install.pdf",
              "Revit Model": "Peninsula_K302.rvt",
              "CAD Drawing": "Peninsula_K302.dwg",
            },
            faqs: [
              {
                question: "Is the K302 suitable for coastal environments?",
                answer: "Yes — the K302's materials are specified for higher corrosion resistance and are suitable for coastal installation with correct site selection.",
              },
            ],
          },
          E201: {
            name: "EcoSan E201",
            overview: "Environmentally friendly toilet solution with composting technology and minimal water usage.",
            description:
              "The EcoSan E201 is our flagship environmentally friendly toilet solution that uses advanced composting technology. It requires minimal water and produces valuable compost as a byproduct. Designed for parks and remote locations where traditional plumbing may be challenging.",
            specifications: ["Dimensions: 2.2m x 1.8m", "Height: 2.4m", "Capacity: Single cubicle", "Weight: 380kg"],
            imageGallery: ["toilet/1", "toilet/2", "toilet/3"],
            files: {
              "PDF Specification": "EcoSan_E201_Spec.pdf",
              "Installation Guide": "EcoSan_E201_Install.pdf",
              "Revit Model": "EcoSan_E201.rvt",
              "Maintenance Manual": "EcoSan_E201_Maintenance.pdf",
            },
            faqs: [
              {
                question: "How does the composting system work?",
                answer: "The EcoSan E201 uses a dry composting system that separates liquids and solids and treats waste on-site to reduce water usage significantly.",
              },
              {
                question: "Can the E201 operate off-grid?",
                answer: "Yes, the E201 is designed for remote locations and can operate without mains water, though regular servicing is required.",
              },
            ],
          },
          SS101: {
            name: "Small Span SS101",
            overview: "Compact pedestrian bridge for garden paths and small water crossings with elegant design.",
            description:
              "The Small Span SS101 is a beautifully designed pedestrian bridge perfect for garden paths and small water crossings. Its elegant design adds aesthetic value while providing safe passage. The structure is engineered for durability and ease of installation.",
            specifications: ["Span: 3.0m", "Width: 1.2m", "Load Capacity: 400kg", "Weight: 280kg"],
            imageGallery: ["bridge/1", "bridge/2", "bridge/3"],
            files: {
              "PDF Specification": "SmallSpan_SS101_Spec.pdf",
              "Installation Guide": "SmallSpan_SS101_Install.pdf",
              "Revit Model": "SmallSpan_SS101.rvt",
              "Engineering Report": "SmallSpan_SS101_Engineering.pdf",
            },
          },
          R101: {
            name: "Access Ramp R101",
            overview: "ADA compliant access ramp with gentle slope and non-slip surface for universal accessibility.",
            description:
              "The Access Ramp R101 is designed to provide universal accessibility with its ADA compliant design. It features a gentle slope, non-slip surface, and sturdy handrails. Perfect for public buildings, parks, and commercial spaces requiring accessible entry points.",
            specifications: ["Length: 6.0m", "Width: 1.2m", "Slope: 1:12", "Weight: 320kg"],
            imageGallery: ["access/1", "access/2", "access/3"],
            files: {
              "PDF Specification": "Ramp_R101_Spec.pdf",
              "Installation Guide": "Ramp_R101_Install.pdf",
              "Revit Model": "Ramp_R101.rvt",
              "Compliance Certificate": "Ramp_R101_ADA.pdf",
            },
          },
        },
      },
      {
        step: 5,
        title: "Configure Options",
        options: {
          "Post Material": [
            { value: "Pine", imageUrl: "" },
            { value: "Hardwood", imageUrl: "" },
            { value: "Steel", imageUrl: "" },
            { value: "Aluminum", imageUrl: "" },
            { value: "Composite", imageUrl: "" },
            { value: "Recycled Plastic", imageUrl: "" },
          ],
          "Roof Option": [
            { value: "Colorbond", imageUrl: "" },
            { value: "Ultra Grade", imageUrl: "" },
            { value: "Timber", imageUrl: "" },
            { value: "Polycarbonate", imageUrl: "" },
            { value: "Green Roof", imageUrl: "" },
            { value: "Solar Panels", imageUrl: "" },
          ],
          Screen: [
            { value: "Rebated Front", imageUrl: "" },
            { value: "None", imageUrl: "" },
            { value: "Full Enclosure", imageUrl: "" },
            { value: "Half Height", imageUrl: "" },
            { value: "Decorative Pattern", imageUrl: "" },
            { value: "Custom Design", imageUrl: "" },
          ],
          "Floor Finish": [
            { value: "Concrete", imageUrl: "" },
            { value: "Timber Decking", imageUrl: "" },
            { value: "Rubber", imageUrl: "" },
            { value: "Pavers", imageUrl: "" },
            { value: "Gravel", imageUrl: "" },
            { value: "Natural Ground", imageUrl: "" },
          ],
          "Color Scheme": [
            { value: "Natural", imageUrl: "" },
            { value: "Modern", imageUrl: "" },
            { value: "Heritage", imageUrl: "" },
            { value: "Coastal", imageUrl: "" },
            { value: "Urban", imageUrl: "" },
            { value: "Custom", imageUrl: "" },
          ],
        },
        dynamicUpdates: {
          updateImages: true,
          updateFiles: true,
        },
      },
      {
        step: 6,
        title: "Contact Information",
        fields: [
          {
            name: "fullName",
            label: "Full Name",
            type: "text",
            required: true,
          },
          {
            name: "email",
            label: "Email Address",
            type: "email",
            required: true,
          },
          {
            name: "phone",
            label: "Phone Number",
            type: "tel",
            required: false,
          },
          {
            name: "company",
            label: "Company/Organization",
            type: "text",
            required: false,
          },
          {
            name: "message",
            label: "Additional Notes",
            type: "textarea",
            required: false,
          },
        ],
      },
    ],
  },
};
