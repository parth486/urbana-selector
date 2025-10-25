# Urbana Selector WordPress Plugin

A modern WordPress plugin that provides a product configurator with React + Tailwind interface. Built according to the blueprint requirements with three React applications for different functionalities.

## Features

### 1. Stepper Form (Frontend)
- Multi-step product selection process
- Product Group → Product Range → Individual Product → Content → Options → Contact
- Product-specific configuration options with image previews
- Built with React 18, Zustand state management, and HeroUI components
- Responsive design with Tailwind CSS
- Form submissions stored in database with email notifications

### 2. Data Builder App (Admin)
- Visual interface to create and manage product data
- Drag-and-drop functionality with @dnd-kit
- Product Groups, Ranges, and Individual Products management
- Product-specific options management with image associations
- Relationships manager to connect products
- Digital Ocean Spaces integration for asset management
- Data preview and export/import functionality
- Real-time updates to the frontend stepper

### 3. Admin Orders App (Admin)
- Customer submission management with TanStack Table
- Advanced filtering, sorting, and pagination
- Status management (new, viewed, contacted, completed, archived)
- Priority levels and notes system
- Bulk operations and export functionality
- Dashboard statistics and analytics

### 4. Settings App (Admin)
- Comprehensive plugin configuration interface
- Digital Ocean Spaces integration and management
- General plugin settings and preferences
- Connection testing and asset browsing capabilities
- System information and debug tools
- Real-time configuration validation

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS v4
- **State Management**: Zustand with persistence
- **UI Components**: HeroUI React, Iconify icons
- **Forms**: TanStack Form with validation
- **Tables**: TanStack Table with filtering/sorting
- **Animation**: Framer Motion
- **Build Tool**: Vite with multiple entry points
- **Backend**: WordPress REST API, Custom database tables

## Installation

1. **Clone/Download** the plugin files to your WordPress plugins directory:
   ```
   wp-content/plugins/urbana/
   ```

2. **Install Dependencies** (if developing):
   ```bash
   cd wp-content/plugins/urbana
   pnpm install
   ```

3. **Build Assets** (if developing):
   ```bash
   pnpm build
   ```

4. **Activate Plugin** in WordPress Admin → Plugins

## Usage

### Frontend Integration

Add the stepper form to any page or post using the shortcode:

```php
[urbana_product_stepper id="7"]
```

Optional parameters:
```php
[urbana_product_stepper theme="default" container_class="my-custom-class"]
```

### Admin Interface

After activation, you'll find "Urbana Selector" in the WordPress admin menu with:

1. **Settings** - Plugin configuration and Digital Ocean Spaces setup
2. **Data Builder** - Manage product data structure
3. **Customer Orders** - View and manage submissions

## Product Options System

The plugin now supports **product-specific configuration options** with associated images:

### Product-Specific Options
- Each product can have its own unique set of configuration options
- Options are organized into groups (e.g., "Post Material", "Roof Option", "Screen")
- Each option value can have an associated image for visual selection
- Options are automatically extracted from Digital Ocean Spaces `img_conf` folders

### Option Management
- **Data Builder**: Configure options per product with image associations
- **Frontend Stepper**: Dynamic option selection with image previews
- **Step 5**: Shows only options available for the selected product
- Products without options skip Step 5 automatically

### Digital Ocean Structure for Options
```
your-bucket/
├── category/
│   ├── range/
│   │   ├── product-code/
│   │   │   ├── img/              # Product images
│   │   │   ├── download/         # Product files
│   │   │   └── img_conf/         # Configuration options
│   │   │       ├── Post Material/
│   │   │       │   ├── Aluminum.jpg
│   │   │       │   └── Steel.jpg
│   │   │       ├── Roof Option/
│   │   │       │   ├── Flat.jpg
│   │   │       │   └── Pitched.jpg
│   │   │       └── Screen/
│   │   │           └── Mesh.jpg
```

## Digital Ocean Spaces Integration

The plugin includes comprehensive Digital Ocean Spaces integration for storing and managing product assets. This integration uses S3-compatible API calls without requiring the AWS SDK.

### Setting Up Digital Ocean Spaces

1. **Access Settings**: Navigate to Settings in the WordPress admin panel
2. **Digital Ocean Configuration**: In the Settings app, locate the Digital Ocean Settings section
3. **Required Credentials**:
   - **Endpoint**: Your Digital Ocean Spaces endpoint (e.g., `fra1.digitaloceanspaces.com`)
   - **Access Key**: Your Digital Ocean Spaces access key
   - **Secret Key**: Your Digital Ocean Spaces secret key  
   - **Bucket Name**: The name of your Digital Ocean Spaces bucket
   - **Region**: Your Digital Ocean region (e.g., `fra1`)

4. **Test Connection**: Use the "Test Connection" button to verify your credentials

### Fetching Assets from Digital Ocean

The Data Builder provides a "Fetch from Digital Ocean" feature that:

- **Discovers All Assets**: Images, downloads, and configuration options
- **Product-Specific Options**: Automatically extracts options from `img_conf` folders
- **Structured Import**: Organizes assets by category, range, and product
- **Update or Replace**: Choose to update existing products or replace all data
- **Real-time Preview**: Shows what will be imported before confirming

### Asset Organization

#### Standard Assets
- **Images**: Stored in `product-code/img/` folder
- **Downloads**: Stored in `product-code/download/` folder

#### Configuration Options
- **Location**: `product-code/img_conf/` folder
- **Structure**: Organized by option group name (folder) and option value (image file)
- **Format**: Each image filename becomes an option value
- **Example**:
  ```
  k302/img_conf/
  ├── Post Material/
  │   ├── Aluminum.jpg    → Option: Post Material = "Aluminum"
  │   └── Steel.jpg       → Option: Post Material = "Steel"
  └── Roof Option/
      ├── Flat.jpg        → Option: Roof Option = "Flat"
      └── Pitched.jpg     → Option: Roof Option = "Pitched"
  ```

### Folder Structure Requirements

For optimal functionality, organize your Digital Ocean Spaces bucket with the following structure:

```
your-bucket/
├── access/
│   ├── boardwalk/
│   │   ├── k302/
│   │   │   ├── img/
│   │   │   ├── download/
│   │   │   └── img_conf/
│   │   │       ├── Post Material/
│   │   │       ├── Roof Option/
│   │   │       └── Screen/
│   │   └── whyl63/
│   │       ├── img/
│   │       └── download/
│   ├── pathway/
│   └── ...
├── bridge/
│   ├── decorative/
│   ├── heavy-duty/
│   └── ...
└── ...
```

### Import Modes

1. **Update Mode**: 
   - Updates assets for existing products only
   - Preserves product names, descriptions, and specifications
   - Updates images, files, and options from Digital Ocean
   - Safe for refreshing asset URLs

2. **Replace Mode**:
   - Clears all existing data
   - Creates complete structure from Digital Ocean
   - Imports groups, ranges, products, and options
   - Use when starting fresh or restructuring

### Technical Implementation

#### Authentication
- Uses AWS Signature Version 4 authentication
- Implements custom signing without AWS SDK dependency
- Handles query string parameters for S3-compatible requests

#### Folder Discovery
- Recursive exploration using S3 delimiter parameters
- Discovers empty folders through systematic bucket traversal
- Maintains complete folder structure including nested hierarchies
- Extracts configuration options from `img_conf` subfolders

#### API Endpoints
The plugin exposes REST API endpoints for Digital Ocean integration:
- `GET /wp-json/urbana/v1/test-do-connection` - Test Digital Ocean connection
- `GET /wp-json/urbana/v1/fetch-do-assets` - Fetch all assets from Digital Ocean
- `GET /wp-json/urbana/v1/get-do-config` - Get current Digital Ocean configuration
- `POST /wp-json/urbana/v1/update-do-config` - Update Digital Ocean settings

## Development

### File Structure

```
urbana/
├── urbana-selector.php          # Main plugin file
├── includes/                    # PHP classes
│   ├── Admin/AdminInit.php      # Admin interface setup
│   ├── Public/PublicInit.php    # Frontend functionality  
│   ├── API/RestAPI.php          # REST API endpoints
│   └── Database/DatabaseManager.php # Database operations
├── src/                         # React applications source
│   ├── stepper-app/            # Frontend stepper form
│   ├── data-builder-app/       # Admin data management
│   ├── admin-orders-app/       # Admin orders management
│   ├── settings-app/           # Admin settings
│   └── data/productData.ts     # Default product data
├── assets/dist/                # Built assets (auto-generated)
├── package.json                # Dependencies and scripts
├── vite.config.ts             # Build configuration
├── tailwind.config.mjs        # Tailwind configuration
└── tsconfig.json              # TypeScript configuration
```

### Build Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint

### State Management

Each app uses Zustand for state management:

- **Stepper**: `useStepperStore` - Manages form progress and selections with persistence
- **Data Builder**: `useDataBuilderStore` - Manages product data CRUD with options
- **Admin Orders**: `useAdminOrdersStore` - Manages submissions and filters

#### Persistence

The stepper form uses Zustand's persist middleware to automatically save user selections and current step progress to localStorage. This ensures that:

- User selections are preserved when navigating between pages
- Form progress is maintained after browser refresh
- Users can close and return to the form without losing their work
- The form state persists across browser sessions

The persisted data includes the current step and all user selections (product group, range, individual product, options, and contact information).

### Product Data Structure

The plugin uses a comprehensive data structure stored in the `wp_urbana_product_data` database table:

#### 1. Stepper Form Data (`stepper_form_data`)

This structure defines the actual stepper form configuration used on the frontend:

```typescript
{
  id: number,
  stepperForm: {
    steps: [
      {
        step: 1,
        title: "Select Product Group",
        categories: string[]  // Product group names
      },
      {
        step: 2,
        title: "Select Product Range",
        ranges: Record<string, string[]>  // Group → Range names
      },
      {
        step: 3,
        title: "Select Individual Product",
        products: Record<string, string[]>  // Range → Product codes
      },
      {
        step: 4,
        title: "View Product Content",
        productDetails: Record<string, ProductContent>  // Code → Details
      },
      {
        step: 5,
        title: "Configure Options",
        options: Record<string, OptionValue[]>,  // Global options
        productOptions: Record<string, Record<string, OptionValue[]>>  // Product-specific
      },
      {
        step: 6,
        title: "Contact Information",
        fields: FormField[]
      }
    ]
  }
}
```

#### 2. Data Builder Storage (`stepper_data_builder_{id}`)

This structure stores all the detailed information for the Data Builder app, including full product details, icons, descriptions, and relationships. This is the "source of truth" for all product management:

```typescript
{
  productGroups: [
    {
      id: string,           // Generated unique ID (kebab-case)
      name: string,         // Display name (e.g., "Shelter", "Toilet", "Bridge")
      icon: string,         // Iconify icon name (e.g., "lucide:home", "lucide:bath")
      description: string   // Full description of the product group
    }
  ],
  productRanges: [
    {
      id: string,           // Generated unique ID (kebab-case)
      name: string,         // Display name (e.g., "Peninsula", "EcoSan")
      image: string,        // URL to range image
      description: string,  // Full description of the range
      tags: string[]        // Tags for filtering/categorization
    }
  ],
  products: [
    {
      id: string,           // Generated unique ID (kebab-case)
      code: string,         // Product code (e.g., "K302", "WHYL63")
      name: string,         // Product name
      overview: string,     // Short overview text
      description: string,  // Full product description
      specifications: string[],  // Array of specification points
      imageGallery: string[],    // Array of image URLs
      files: Record<string, string>,  // File name → URL mapping
      options?: Record<string, Array<{   // Product-specific options
        value: string,
        imageUrl?: string
      }>>
    }
  ],
  relationships: {
    groupToRanges: Record<string, string[]>,    // Group ID → Range IDs
    rangeToProducts: Record<string, string[]>   // Range ID → Product IDs
  },
  lastSaved: string  // ISO timestamp of last save
}
```

**Key Points:**

- **Two-tier storage**: `stepper_form_data` for the frontend form structure, `stepper_data_builder_{id}` for complete product management
- **Icon system**: Product groups can have custom Iconify icons for better visual identification
- **Rich metadata**: Full descriptions, specifications, and image galleries for each product
- **Relationship mapping**: Explicit relationships between groups, ranges, and products
- **Product-specific options**: Each product can have unique configuration options with image previews
- **Flexible file management**: Download files are stored with customizable display names
- **Tag system**: Product ranges support tagging for advanced filtering and organization

**Database Storage:**

Both structures are stored in the `wp_urbana_product_data` table:
- `data_key` = `'stepper_form_data'` → Contains the stepper form configuration
- `data_key` = `'stepper_data_builder_1'` → Contains the complete product data for stepper ID 1
- Each stepper can have its own separate data builder storage

### API Endpoints

The plugin creates the following REST API endpoints:

- `POST /wp-json/urbana/v1/submit-form` - Submit stepper form
- `GET /wp-json/urbana/v1/submissions` - Get customer submissions (admin)
- `PATCH /wp-json/urbana/v1/submissions/{id}` - Update submission (admin)
- `DELETE /wp-json/urbana/v1/submissions/{id}` - Delete submission (admin)
- `GET /wp-json/urbana/v1/product-data` - Get product configuration (admin)
- `POST /wp-json/urbana/v1/product-data` - Update product configuration (admin)

### Database Tables

- `wp_urbana_submissions` - Customer form submissions
- `wp_urbana_product_data` - Product configuration data

## Customization

### Theming

The plugin uses HeroUI's theming system. You can customize colors and appearance by modifying the Tailwind configuration or by adding custom CSS.

### Adding Custom Steps

1. Update the product data structure
2. Create new step components in `src/stepper-app/components/steps/`
3. Register the step in the `ProductStepper` component
4. Update the store logic for validation

## Performance Considerations

- Built assets are optimized and chunked for efficient loading
- Database queries use proper indexing
- Frontend state is persisted to prevent data loss
- Lazy loading for non-critical components
- Optimized bundle sizes with tree shaking
- Memoized computations for data transformations

## Security

- Nonce verification for all AJAX requests
- Capability checks for admin functions
- Input sanitization and validation
- SQL injection prevention with prepared statements
- XSS protection with proper escaping

## Browser Support

- Modern browsers with ES2020 support
- Mobile responsive design
- Progressive enhancement approach

## License

GPL v2 or later

## Support

For issues and feature requests, please refer to the plugin documentation or contact the development team.