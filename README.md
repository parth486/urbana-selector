# Urbana Selector WordPress Plugin

A modern WordPress plugin that provides a product configurator with React + Tailwind interface. Built according to the blueprint requirements with three React applications for different functionalities.

## Features

### 1. Stepper Form (Frontend)
- Multi-step product selection process
- Product Group → Product Range → Individual Product → Content → Options → Contact
- Built with React 18, Zustand state management, and HeroUI components
- Responsive design with Tailwind CSS
- Form submissions stored in database with email notifications

### 2. Data Builder App (Admin)
- Visual interface to create and manage product data
- Drag-and-drop functionality with @dnd-kit
- Product Groups, Ranges, and Individual Products management
- Relationships manager to connect products
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
[urbana_product_stepper]
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

The Settings app provides a "Fetch from Digital Ocean" feature that:

- **Discovers All Folders**: Includes both empty folders and folders containing files
- **Structured Analysis**: Displays organized folder hierarchy with file counts
- **Asset Statistics**: Shows total folders, files, and size information  
- **Debug Information**: Provides detailed response data for troubleshooting
- **Real-time Testing**: Tests connection before fetching assets

### Technical Implementation

#### Authentication
- Uses AWS Signature Version 4 authentication
- Implements custom signing without AWS SDK dependency
- Handles query string parameters for S3-compatible requests

#### Folder Discovery
- Recursive exploration using S3 delimiter parameters
- Discovers empty folders through systematic bucket traversal
- Maintains complete folder structure including nested hierarchies

#### API Endpoints
The plugin exposes REST API endpoints for Digital Ocean integration:
- `GET /wp-json/urbana/v1/test-do-connection` - Test Digital Ocean connection
- `GET /wp-json/urbana/v1/fetch-do-assets` - Fetch all assets from Digital Ocean
- `GET /wp-json/urbana/v1/get-do-config` - Get current Digital Ocean configuration
- `POST /wp-json/urbana/v1/update-do-config` - Update Digital Ocean settings

#### Error Handling
- Comprehensive error logging and reporting
- Connection timeout management
- Invalid credential detection
- Network error recovery

### Folder Structure Requirements

For optimal functionality, organize your Digital Ocean Spaces bucket with the following structure:
```
your-bucket/
│── access/
│   ├── boardwalk/
│   ├── pathway/
│	└── ...
│── bridge/
│   ├── decorative/
│   ├── heavy-duty/
│   └── ...
│── lighting/
│── seating/
│── shelter/
│── toilet/
```

The plugin will discover both populated folders (containing files) and empty folders, maintaining the complete structure for data building purposes.

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
- **Data Builder**: `useDataBuilderStore` - Manages product data CRUD
- **Admin Orders**: `useAdminOrdersStore` - Manages submissions and filters

#### Persistence

The stepper form uses Zustand's persist middleware to automatically save user selections and current step progress to localStorage. This ensures that:

- User selections are preserved when navigating between pages
- Form progress is maintained after browser refresh
- Users can close and return to the form without losing their work
- The form state persists across browser sessions

The persisted data includes the current step and all user selections (product group, range, individual product, options, and contact information).

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

### Product Data Structure

Product data follows this structure:
```javascript
{
  stepperForm: {
    steps: [
      {
        step: 1,
        title: "Select Product Group",
        categories: ["Shelter", "Toilet", "Bridge", ...]
      },
      // ... more steps
    ]
  }
}
```

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