<?php
namespace Urbana\API;

class RestAPI {

	private $db_manager;

	public function __construct() {
		$this->db_manager = new \Urbana\Database\DatabaseManager();
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes() {
		// Submit form endpoint
		register_rest_route(
			'urbana/v1',
			'/submit-form',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'submit_form' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'selections' => array(
						'required' => true,
						'type'     => 'object',
					),
				),
			)
		);

		// Get submissions (admin only)
		register_rest_route(
			'urbana/v1',
			'/submissions',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_submissions' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		// Update submission (admin only)
		register_rest_route(
			'urbana/v1',
			'/submissions/(?P<id>\d+)',
			array(
				'methods'             => 'PATCH',
				'callback'            => array( $this, 'update_submission' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
				'args'                => array(
					'id' => array(
						'required' => true,
						'type'     => 'integer',
					),
				),
			)
		);

		// Delete submission (admin only)
		register_rest_route(
			'urbana/v1',
			'/submissions/(?P<id>\d+)',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_submission' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
				'args'                => array(
					'id' => array(
						'required' => true,
						'type'     => 'integer',
					),
				),
			)
		);

		// Bulk update submissions (admin only)
		register_rest_route(
			'urbana/v1',
			'/submissions/bulk-update',
			array(
				'methods'             => 'PATCH',
				'callback'            => array( $this, 'bulk_update_submissions' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		// Export submissions (admin only)
		register_rest_route(
			'urbana/v1',
			'/submissions/export',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'export_submissions' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		// Get product data (admin only)
		register_rest_route(
			'urbana/v1',
			'/product-data',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_product_data' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		// Update product data (admin only)
		register_rest_route(
			'urbana/v1',
			'/product-data',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'update_product_data' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		// Generate asset folders endpoint (admin only)
		register_rest_route(
			'urbana/v1',
			'/generate-asset-folders',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'generate_asset_folders' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
				'args'                => array(
					'structures' => array(
						'required' => true,
						'type'     => 'array',
					),
				),
			)
		);

		register_rest_route(
			'urbana/v1',
			'/debug-paths',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'debug_paths' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		// Fetch product images endpoint (admin only)
		register_rest_route(
			'urbana/v1',
			'/fetch-product-images',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'fetch_product_images' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
				'args'                => array(
					'productCode' => array(
						'required' => true,
						'type'     => 'string',
					),
					'category'    => array(
						'required' => true,
						'type'     => 'string',
					),
					'range'       => array(
						'required' => true,
						'type'     => 'string',
					),
				),
			)
		);

		// Fetch product files endpoint (admin only)
		register_rest_route(
			'urbana/v1',
			'/fetch-product-files',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'fetch_product_files' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
				'args'                => array(
					'productCode' => array(
						'required' => true,
						'type'     => 'string',
					),
					'category'    => array(
						'required' => true,
						'type'     => 'string',
					),
					'range'       => array(
						'required' => true,
						'type'     => 'string',
					),
				),
			)
		);

		// Fetch all product assets endpoint (admin only)
		register_rest_route(
			'urbana/v1',
			'/fetch-all-product-assets',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'fetch_all_product_assets' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		// Digital Ocean Spaces endpoints
		register_rest_route(
			'urbana/v1',
			'/digital-ocean/test-connection',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'test_do_connection' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		register_rest_route(
			'urbana/v1',
			'/digital-ocean/fetch-assets',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'fetch_do_assets' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		register_rest_route(
			'urbana/v1',
			'/digital-ocean/config',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_do_config' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		register_rest_route(
			'urbana/v1',
			'/digital-ocean/config',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'update_do_config' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);
	}

	public function submit_form( $request ) {
		$selections   = $request->get_param( 'selections' );
		$submitted_at = $request->get_param( 'submittedAt' );

		// Prepare data for database
		$submission_data = array(
			'product_group'      => sanitize_text_field( $selections['productGroup'] ),
			'product_range'      => sanitize_text_field( $selections['productRange'] ),
			'individual_product' => sanitize_text_field( $selections['individualProduct'] ),
			'options'            => $selections['options'],
			'contact_info'       => array(
				'fullName' => sanitize_text_field( $selections['contactInfo']['fullName'] ),
				'email'    => sanitize_email( $selections['contactInfo']['email'] ),
				'phone'    => sanitize_text_field( $selections['contactInfo']['phone'] ),
				'company'  => sanitize_text_field( $selections['contactInfo']['company'] ),
				'message'  => sanitize_textarea_field( $selections['contactInfo']['message'] ),
			),
		);

		$result = $this->db_manager->insert_submission( $submission_data );

		if ( $result === false ) {
			return new \WP_Error( 'submission_failed', 'Failed to save submission', array( 'status' => 500 ) );
		}

		$submission_id = $this->db_manager->get_last_insert_id();

		// Send email notification
		$this->send_email_notification( $submission_data );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'id'      => $submission_id,
			),
			201
		);
	}

	public function get_submissions( $request ) {
		$args = array(
			'status'   => $request->get_param( 'status' ),
			'priority' => $request->get_param( 'priority' ),
			'limit'    => $request->get_param( 'limit' ) ?: 25,
			'offset'   => $request->get_param( 'offset' ) ?: 0,
		);

		$submissions = $this->db_manager->get_submissions( $args );

		// Format data for frontend
		$formatted_submissions = array_map(
			function ( $submission ) {
				return array(
					'id'                => $submission['id'],
					'submittedAt'       => $submission['submitted_at'],
					'productGroup'      => $submission['product_group'],
					'productRange'      => $submission['product_range'],
					'individualProduct' => $submission['individual_product'],
					'options'           => json_decode( $submission['options'], true ),
					'contactInfo'       => json_decode( $submission['contact_info'], true ),
					'status'            => $submission['status'],
					'notes'             => $submission['notes'],
					'priority'          => $submission['priority'],
				);
			},
			$submissions
		);

		return new \WP_REST_Response( $formatted_submissions );
	}

	public function update_submission( $request ) {
		$id   = $request->get_param( 'id' );
		$data = array();

		if ( $request->has_param( 'status' ) ) {
			$data['status'] = sanitize_text_field( $request->get_param( 'status' ) );
		}

		if ( $request->has_param( 'priority' ) ) {
			$data['priority'] = sanitize_text_field( $request->get_param( 'priority' ) );
		}

		if ( $request->has_param( 'notes' ) ) {
			$data['notes'] = sanitize_textarea_field( $request->get_param( 'notes' ) );
		}

		$result = $this->db_manager->update_submission( $id, $data );

		if ( $result === false ) {
			return new \WP_Error( 'update_failed', 'Failed to update submission', array( 'status' => 500 ) );
		}

		return new \WP_REST_Response( array( 'success' => true ) );
	}

	public function delete_submission( $request ) {
		$id = $request->get_param( 'id' );

		$result = $this->db_manager->delete_submission( $id );

		if ( $result === false ) {
			return new \WP_Error( 'delete_failed', 'Failed to delete submission', array( 'status' => 500 ) );
		}

		return new \WP_REST_Response( array( 'success' => true ) );
	}

	public function bulk_update_submissions( $request ) {
		$ids    = $request->get_param( 'ids' );
		$status = sanitize_text_field( $request->get_param( 'status' ) );

		if ( ! is_array( $ids ) || empty( $ids ) ) {
			return new \WP_Error( 'invalid_ids', 'Invalid submission IDs', array( 'status' => 400 ) );
		}

		foreach ( $ids as $id ) {
			$this->db_manager->update_submission( $id, array( 'status' => $status ) );
		}

		return new \WP_REST_Response( array( 'success' => true ) );
	}

	public function export_submissions( $request ) {
		$submissions = $request->get_param( 'submissions' );
		$format      = $request->get_param( 'format' );

		if ( $format === 'csv' ) {
			return $this->export_csv( $submissions );
		} elseif ( $format === 'xlsx' ) {
			return $this->export_xlsx( $submissions );
		}

		return new \WP_Error( 'invalid_format', 'Invalid export format', array( 'status' => 400 ) );
	}

	public function get_product_data( $request ) {
		$data = $this->db_manager->get_product_data();

		if ( ! $data ) {
			return new \WP_Error( 'no_data', 'No product data found', array( 'status' => 404 ) );
		}

		return new \WP_REST_Response( $data );
	}

	public function update_product_data( $request ) {
		$data = $request->get_json_params();

		// Save stepper form data first
		if ( isset( $data['stepper_form_data'] ) ) {
			$stepper_result = $this->db_manager->update_product_data( 'stepper_form_data', $data['stepper_form_data'] );
			if ( $stepper_result === false ) {
				return new \WP_Error( 'save_failed', 'Failed to save stepper form data', array( 'status' => 500 ) );
			}

			// Get the ID from the stepper form data save operation
			$stepper_id = $this->db_manager->get_last_insert_id();

			// Save data builder information with the ID from stepper form data
			if ( isset( $data['stepper_data_builder'] ) && $stepper_id ) {
				$builder_key    = 'stepper_data_builder_' . $stepper_id;
				$builder_result = $this->db_manager->update_product_data( $builder_key, $data['stepper_data_builder'] );
				if ( $builder_result === false ) {
					return new \WP_Error( 'save_failed', 'Failed to save data builder information', array( 'status' => 500 ) );
				}
			}
		}

		return new \WP_REST_Response(
			array(
				'success'    => true,
				'stepper_id' => $stepper_id ?? null,
			)
		);
	}

	public function check_admin_permission() {
		return current_user_can( 'manage_options' );
	}

	private function send_email_notification( $data ) {
		$to      = get_option( 'admin_email' );
		$subject = 'New Urbana Product Configuration Submission';

		$message  = "New product configuration submission received:\n\n";
		$message .= "Contact: {$data['contact_info']['fullName']} ({$data['contact_info']['email']})\n";
		$message .= "Product: {$data['product_group']} > {$data['product_range']} > {$data['individual_product']}\n";
		$message .= "Company: {$data['contact_info']['company']}\n";
		$message .= "Phone: {$data['contact_info']['phone']}\n";
		$message .= "Message: {$data['contact_info']['message']}\n";

		wp_mail( $to, $subject, $message );
	}

	private function export_csv( $submissions ) {
		$filename = 'urbana-submissions-' . date( 'Y-m-d' ) . '.csv';

		header( 'Content-Type: text/csv' );
		header( 'Content-Disposition: attachment; filename="' . $filename . '"' );

		$output = fopen( 'php://output', 'w' );

		// CSV headers
		fputcsv(
			$output,
			array(
				'ID',
				'Submitted At',
				'Full Name',
				'Email',
				'Phone',
				'Company',
				'Product Group',
				'Product Range',
				'Individual Product',
				'Status',
				'Priority',
				'Notes',
			)
		);

		foreach ( $submissions as $submission ) {
			fputcsv(
				$output,
				array(
					$submission['id'],
					$submission['submittedAt'],
					$submission['contactInfo']['fullName'],
					$submission['contactInfo']['email'],
					$submission['contactInfo']['phone'],
					$submission['contactInfo']['company'],
					$submission['productGroup'],
					$submission['productRange'],
					$submission['individualProduct'],
					$submission['status'],
					$submission['priority'],
					$submission['notes'],
				)
			);
		}

		fclose( $output );
		exit;
	}

	private function export_xlsx( $submissions ) {
		// For XLSX export, you'd need a library like PhpSpreadsheet
		// For now, fallback to CSV
		return $this->export_csv( $submissions );
	}

	public function generate_asset_folders( $request ) {
		$structures = $request->get_param( 'structures' );

		if ( empty( $structures ) ) {
			return new \WP_Error( 'no_structures', 'No folder structures provided', array( 'status' => 400 ) );
		}

		// Use the defined constant for plugin path
		$plugin_dir      = URBANA_PLUGIN_PATH;
		$created_folders = array();
		$errors          = array();

		foreach ( $structures as $structure ) {
			// Validate structure data
			if ( ! isset( $structure['imagesPath'] ) || ! isset( $structure['downloadsPath'] ) ) {
				$errors[] = 'Invalid structure data provided';
				continue;
			}

			// Construct full paths
			$images_path    = $plugin_dir . $structure['imagesPath'];
			$downloads_path = $plugin_dir . $structure['downloadsPath'];

			// Normalize paths to avoid issues with different directory separators
			$images_path           = wp_normalize_path( $images_path );
			$downloads_path        = wp_normalize_path( $downloads_path );
			$plugin_dir_normalized = wp_normalize_path( $plugin_dir );

			// Enhanced security check - ensure paths are within plugin directory
			$real_images_parent    = wp_normalize_path( dirname( $images_path ) );
			$real_downloads_parent = wp_normalize_path( dirname( $downloads_path ) );

			// Check if the parent directories are within the plugin directory
			if ( strpos( $real_images_parent, $plugin_dir_normalized ) !== 0 ||
			strpos( $real_downloads_parent, $plugin_dir_normalized ) !== 0 ) {
				$errors[] = "Invalid path detected for security reasons: {$structure['imagesPath']} or {$structure['downloadsPath']}";
				continue;
			}

			// Create images folder
			if ( ! file_exists( $images_path ) ) {
				if ( wp_mkdir_p( $images_path ) ) {
					$created_folders[] = $structure['imagesPath'];

					// Create .gitkeep file to ensure folder is tracked
					file_put_contents( $images_path . '/.gitkeep', '' );

					// Create sample README file
					$readme_content  = "# Images Directory\n\n";
					$readme_content .= "Product: {$structure['category']}/{$structure['range']}/{$structure['productCode']}\n";
					$readme_content .= 'Generated on: ' . current_time( 'Y-m-d H:i:s' ) . "\n\n";
					$readme_content .= "Place product images in this directory:\n";
					$readme_content .= "- hero-image.jpg (main product image)\n";
					$readme_content .= "- gallery-1.jpg, gallery-2.jpg, etc. (additional images)\n\n";
					$readme_content .= "Example usage in product data:\n";
					$readme_content .= "```\n";
					$readme_content .= "imageGallery: [\n";
					$readme_content .= "  '{$structure['imagesPath']}/hero-image.jpg',\n";
					$readme_content .= "  '{$structure['imagesPath']}/gallery-1.jpg',\n";
					$readme_content .= "]\n";
					$readme_content .= "```\n";
					file_put_contents( $images_path . '/README.md', $readme_content );

					// Create a sample .htaccess file to allow image serving
					$htaccess_content  = "# Allow image files to be served\n";
					$htaccess_content .= "<FilesMatch \"\\.(jpg|jpeg|png|gif|webp|svg)$\">\n";
					$htaccess_content .= "    Order allow,deny\n";
					$htaccess_content .= "    Allow from all\n";
					$htaccess_content .= "</FilesMatch>\n";
					file_put_contents( $images_path . '/.htaccess', $htaccess_content );
				} else {
					$errors[] = 'Failed to create images folder: ' . $structure['imagesPath'] . ' (Full path: ' . $images_path . ')';
				}
			} else {
				// Folder exists, just note it
				$errors[] = 'Images folder already exists: ' . $structure['imagesPath'];
			}

			// Create downloads folder
			if ( ! file_exists( $downloads_path ) ) {
				if ( wp_mkdir_p( $downloads_path ) ) {
					$created_folders[] = $structure['downloadsPath'];

					// Create .gitkeep file
					file_put_contents( $downloads_path . '/.gitkeep', '' );

					// Create sample README file
					$readme_content  = "# Downloads Directory\n\n";
					$readme_content .= "Product: {$structure['category']}/{$structure['range']}/{$structure['productCode']}\n";
					$readme_content .= 'Generated on: ' . current_time( 'Y-m-d H:i:s' ) . "\n\n";
					$readme_content .= "Place product files in this directory:\n";
					$readme_content .= "- PDF specifications (.pdf)\n";
					$readme_content .= "- Installation guides (.pdf)\n";
					$readme_content .= "- CAD drawings (.dwg)\n";
					$readme_content .= "- Revit models (.rvt)\n";
					$readme_content .= "- Other technical documents\n\n";
					$readme_content .= "Example usage in product data:\n";
					$readme_content .= "```\n";
					$readme_content .= "files: {\n";
					$readme_content .= "  'PDF Specification': '{$structure['downloadsPath']}/spec.pdf',\n";
					$readme_content .= "  'Installation Guide': '{$structure['downloadsPath']}/install.pdf',\n";
					$readme_content .= "  'CAD Drawing': '{$structure['downloadsPath']}/drawing.dwg',\n";
					$readme_content .= "}\n";
					$readme_content .= "```\n";
					file_put_contents( $downloads_path . '/README.md', $readme_content );

					// Create .htaccess to protect downloads (force download instead of display)
					$htaccess_content  = "# Force download of files instead of displaying them\n";
					$htaccess_content .= "<FilesMatch \"\\.(pdf|dwg|rvt|doc|docx|xls|xlsx)$\">\n";
					$htaccess_content .= "    Header set Content-Disposition attachment\n";
					$htaccess_content .= "</FilesMatch>\n\n";
					$htaccess_content .= "# Prevent directory browsing\n";
					$htaccess_content .= "Options -Indexes\n";
					file_put_contents( $downloads_path . '/.htaccess', $htaccess_content );
				} else {
					$errors[] = 'Failed to create downloads folder: ' . $structure['downloadsPath'] . ' (Full path: ' . $downloads_path . ')';
				}
			} else {
				// Folder exists, just note it
				$errors[] = 'Downloads folder already exists: ' . $structure['downloadsPath'];
			}
		}

		// Separate actual errors from "already exists" messages
		$actual_errors = array_filter(
			$errors,
			function ( $error ) {
				return strpos( $error, 'already exists' ) === false;
			}
		);

		$already_exists = array_filter(
			$errors,
			function ( $error ) {
				return strpos( $error, 'already exists' ) !== false;
			}
		);

		$success = empty( $actual_errors );

		// Build message
		if ( $success ) {
			$message = sprintf( 'Successfully created %d new folders', count( $created_folders ) );
			if ( ! empty( $already_exists ) ) {
				$message .= sprintf( '. %d folders already existed.', count( $already_exists ) );
			}
		} else {
			$message = 'Some folders could not be created. Errors: ' . implode( ', ', $actual_errors );
		}

		return rest_ensure_response(
			array(
				'success'        => $success,
				'message'        => $message,
				'created'        => $created_folders,
				'errors'         => $actual_errors,
				'already_exists' => array_values( $already_exists ),
				'debug_info'     => array(
					'plugin_path'      => $plugin_dir_normalized,
					'total_structures' => count( $structures ),
				),
			)
		);
	}

	public function debug_paths( $request ) {
		$plugin_dir = URBANA_PLUGIN_PATH;

		return rest_ensure_response(
			array(
				'plugin_path'            => $plugin_dir,
				'plugin_path_normalized' => wp_normalize_path( $plugin_dir ),
				'plugin_url'             => URBANA_PLUGIN_URL,
				'sample_structure'       => array(
					'imagesPath'       => 'assets/products/shelter/peninsula/k301/images',
					'full_images_path' => wp_normalize_path( $plugin_dir . 'assets/products/shelter/peninsula/k301/images' ),
				),
				'permissions'            => array(
					'can_create_files'    => is_writable( $plugin_dir ),
					'assets_dir_exists'   => file_exists( $plugin_dir . 'assets' ),
					'assets_dir_writable' => is_writable( $plugin_dir . 'assets' ),
				),
			)
		);
	}

	public function fetch_product_images( $request ) {
		$product_code = sanitize_text_field( $request->get_param( 'productCode' ) );
		$category     = sanitize_text_field( $request->get_param( 'category' ) );
		$range        = sanitize_text_field( $request->get_param( 'range' ) );

		$images_path = URBANA_PLUGIN_PATH . "assets/products/{$category}/{$range}/{$product_code}/images/";

		if ( ! file_exists( $images_path ) ) {
			return rest_ensure_response(
				array(
					'success' => false,
					'message' => 'Images folder not found',
					'images'  => array(),
				)
			);
		}

		$image_extensions = array( 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg' );
		$images           = array();
		$base_url         = URBANA_PLUGIN_URL . "assets/products/{$category}/{$range}/{$product_code}/images/";

		$files = scandir( $images_path );
		foreach ( $files as $file ) {
			if ( $file === '.' || $file === '..' ) {
				continue;
			}

			$file_extension = strtolower( pathinfo( $file, PATHINFO_EXTENSION ) );
			if ( in_array( $file_extension, $image_extensions ) ) {
				$images[] = $base_url . $file;
			}
		}

		// Sort images naturally (hero-image.jpg first, then gallery-1.jpg, etc.)
		usort(
			$images,
			function ( $a, $b ) {
				$a_name = basename( $a );
				$b_name = basename( $b );

				// Prioritize hero-image
				if ( strpos( $a_name, 'hero' ) !== false ) {
					return -1;
				}
				if ( strpos( $b_name, 'hero' ) !== false ) {
					return 1;
				}

				return strnatcmp( $a_name, $b_name );
			}
		);

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => sprintf( 'Found %d images', count( $images ) ),
				'images'  => $images,
			)
		);
	}

	public function fetch_product_files( $request ) {
		$product_code = sanitize_text_field( $request->get_param( 'productCode' ) );
		$category     = sanitize_text_field( $request->get_param( 'category' ) );
		$range        = sanitize_text_field( $request->get_param( 'range' ) );

		$files_path = URBANA_PLUGIN_PATH . "assets/products/{$category}/{$range}/{$product_code}/downloads/";

		if ( ! file_exists( $files_path ) ) {
			return rest_ensure_response(
				array(
					'success' => false,
					'message' => 'Downloads folder not found',
					'files'   => array(),
				)
			);
		}

		$files    = array();
		$base_url = URBANA_PLUGIN_URL . "assets/products/{$category}/{$range}/{$product_code}/downloads/";

		$directory_files = scandir( $files_path );
		foreach ( $directory_files as $file ) {
			if ( $file === '.' || $file === '..' || $file === '.gitkeep' || $file === 'README.md' ) {
				continue;
			}

			$file_name      = pathinfo( $file, PATHINFO_FILENAME );
			$file_extension = strtolower( pathinfo( $file, PATHINFO_EXTENSION ) );

			// Generate a human-readable name based on filename
			$display_name = $this->generate_file_display_name( $file_name, $file_extension );

			$files[ $display_name ] = $base_url . $file;
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => sprintf( 'Found %d files', count( $files ) ),
				'files'   => $files,
			)
		);
	}

	public function fetch_all_product_assets( $request ) {
		// Get all product data from database
		$stepper_id   = absint( $request->get_param( 'stepperID' ) );
		$product_data = $this->db_manager->get_product_data( $stepper_id );

		if ( ! $product_data ) {
			return new \WP_Error( 'no_data', 'No product data found', array( 'status' => 404 ) );
		}

		if ( ! isset( $product_data['stepperForm']['steps'][3]['productDetails'] ) ) {
			return new \WP_Error( 'no_products', 'No product details found', array( 'status' => 404 ) );
		}

		$stepper_form = $product_data['stepperForm'];

		$product_details = $stepper_form['steps'][3]['productDetails'];
		$updated_assets  = array();
		$base_path       = URBANA_PLUGIN_PATH . 'assets/products/';

		foreach ( $product_details as $product_code => $product_info ) {
			// Find the product's category and range by checking the data structure
			$category = null;
			$range    = null;

			// Search through step 2 ranges and step 3 products to find relationships
			if ( isset( $stepper_form['steps'][1]['ranges'] ) &&
			isset( $stepper_form['steps'][2]['products'] ) ) {

				foreach ( $stepper_form['steps'][2]['products'] as $range_name => $product_codes ) {
					if ( in_array( $product_code, $product_codes ) ) {
						$range = $range_name;

						// Find category for this range
						foreach ( $stepper_form['steps'][1]['ranges'] as $category_name => $ranges ) {
							if ( in_array( $range_name, $ranges ) ) {
								$category = $category_name;
								break;
							}
						}
						break;
					}
				}
			}

			if ( ! $category || ! $range ) {
				continue; // Skip if we can't determine the category/range
			}

			$sanitized_category = strtolower( $category );
			$sanitized_range    = strtolower( str_replace( ' ', '-', $range ) );
			$sanitized_code     = strtolower( $product_code );

			// Fetch images
			$images_path = $base_path . "{$sanitized_category}/{$sanitized_range}/{$sanitized_code}/images/";
			$images      = $this->scan_directory_for_images( $images_path, $sanitized_category, $sanitized_range, $sanitized_code );

			// Fetch files
			$files_path = $base_path . "{$sanitized_category}/{$sanitized_range}/{$sanitized_code}/downloads/";
			$files      = $this->scan_directory_for_files( $files_path, $sanitized_category, $sanitized_range, $sanitized_code );

			if ( ! empty( $images ) || ! empty( $files ) ) {
				$updated_assets[ $product_code ] = array(
					'images' => $images,
					'files'  => $files,
				);
			}
		}

		return rest_ensure_response(
			array(
				'success'       => true,
				'message'       => sprintf( 'Processed %d products', count( $updated_assets ) ),
				'productAssets' => $updated_assets,
			)
		);
	}

	private function scan_directory_for_images( $images_path, $category, $range, $product_code ) {
		if ( ! file_exists( $images_path ) ) {
			return array();
		}

		$image_extensions = array( 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg' );
		$images           = array();
		$base_url         = URBANA_PLUGIN_URL . "assets/products/{$category}/{$range}/{$product_code}/images/";

		$files = scandir( $images_path );
		foreach ( $files as $file ) {
			if ( $file === '.' || $file === '..' || $file === '.gitkeep' || $file === 'README.md' ) {
				continue;
			}

			$file_extension = strtolower( pathinfo( $file, PATHINFO_EXTENSION ) );
			if ( in_array( $file_extension, $image_extensions ) ) {
				$images[] = $base_url . $file;
			}
		}

		// Sort images naturally
		usort(
			$images,
			function ( $a, $b ) {
				$a_name = basename( $a );
				$b_name = basename( $b );

				if ( strpos( $a_name, 'hero' ) !== false ) {
					return -1;
				}
				if ( strpos( $b_name, 'hero' ) !== false ) {
					return 1;
				}

				return strnatcmp( $a_name, $b_name );
			}
		);

		return $images;
	}

	private function scan_directory_for_files( $files_path, $category, $range, $product_code ) {
		if ( ! file_exists( $files_path ) ) {
			return array();
		}

		$files    = array();
		$base_url = URBANA_PLUGIN_URL . "assets/products/{$category}/{$range}/{$product_code}/downloads/";

		$directory_files = scandir( $files_path );
		foreach ( $directory_files as $file ) {
			if ( $file === '.' || $file === '..' || $file === '.gitkeep' || $file === 'README.md' ) {
				continue;
			}

			$file_name      = pathinfo( $file, PATHINFO_FILENAME );
			$file_extension = strtolower( pathinfo( $file, PATHINFO_EXTENSION ) );
			$display_name   = $this->generate_file_display_name( $file_name, $file_extension );

			$files[ $display_name ] = $base_url . $file;
		}

		return $files;
	}

	private function generate_file_display_name( $filename, $extension ) {
		// Convert filename to a more readable format
		$name = str_replace( array( '_', '-' ), ' ', $filename );
		$name = ucwords( $name );

		// Add extension context
		switch ( $extension ) {
			case 'pdf':
				if ( strpos( strtolower( $filename ), 'spec' ) !== false ) {
					return 'PDF Specification';
				} elseif ( strpos( strtolower( $filename ), 'install' ) !== false ) {
					return 'Installation Guide';
				} elseif ( strpos( strtolower( $filename ), 'manual' ) !== false ) {
					return 'User Manual';
				} else {
					return $name . ' (PDF)';
				}
			case 'dwg':
				return 'CAD Drawing';
			case 'rvt':
				return 'Revit Model';
			case 'doc':
			case 'docx':
				return $name . ' (Document)';
			case 'xls':
			case 'xlsx':
				return $name . ' (Spreadsheet)';
			default:
				return $name;
		}
	}

	public function test_do_connection( $request ) {
		$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();
		$result    = $do_spaces->test_connection();

		return rest_ensure_response( $result );
	}

	public function fetch_do_assets( $request ) {
		$prefix = sanitize_text_field( $request->get_param( 'prefix' ) ?: '' );

		$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();

		if ( ! $do_spaces->is_configured() ) {
			return new \WP_Error(
				'not_configured',
				'Digital Ocean Spaces not configured. Please check your settings.',
				array( 'status' => 400 )
			);
		}

		// $result = $do_spaces->list_objects( $prefix );
		$result = $do_spaces->get_complete_folder_structure( $prefix );

		if ( ! $result['success'] ) {
			return new \WP_Error(
				'fetch_failed',
				$result['message'],
				array(
					'status'  => 500,
					'details' => $result,
				)
			);
		}

		$structured_data = $do_spaces->organize_objects_by_structure( $result['objects'] );

		return rest_ensure_response(
			array(
				'success'         => true,
				'message'         => $result['message'],
				'total_folders'   => count( $result['folders'] ),
				'total_objects'   => count( $result['objects'] ),
				'raw_folders'     => $result['folders'],
				'raw_objects'     => $result['objects'],
				'structured_data' => $result['structured_data'],
				'debug_info'      => array(
					'prefix'        => $prefix,
					'configuration' => $do_spaces->get_configuration(),
					'categories'    => array_keys( $structured_data ),
				),
			)
		);
	}

	public function get_do_config( $request ) {
		$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();
		$config    = $do_spaces->get_configuration();

		// Don't expose sensitive data
		// unset( $config['access_key'] );
		// unset( $config['secret_key'] );

		return rest_ensure_response( $config );
	}

	public function update_do_config( $request ) {
		$data = $request->get_json_params();

		if ( isset( $data['bucket_name'] ) ) {
			update_option( 'urbana_do_bucket_name', sanitize_text_field( $data['bucket_name'] ) );
		}

		if ( isset( $data['region'] ) ) {
			update_option( 'urbana_do_region', sanitize_text_field( $data['region'] ) );
		}

		if ( isset( $data['access_key'] ) ) {
			update_option( 'urbana_do_access_key', sanitize_text_field( $data['access_key'] ) );
		}

		if ( isset( $data['secret_key'] ) ) {
			update_option( 'urbana_do_secret_key', sanitize_text_field( $data['secret_key'] ) );
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => 'Configuration updated successfully',
			)
		);
	}
}
