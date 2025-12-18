<?php
namespace Urbana\API;
use Exception;
// Add a checkpoint at the start of the file
// error_log('Checkpoint: Start of RestAPI.php');

class RestAPI {

	private $db_manager;

	public function __construct() {
		$this->db_manager = new \Urbana\Database\DatabaseManager();
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes() {
		// error_log('Checkpoint: Inside register_routes method');
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

		// Migration endpoint to update group names in builder data (admin only)
		register_rest_route(
			'urbana/v1',
			'/product-data/migrate-group-name',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'migrate_group_name_in_db' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
				'args'                => array(
					'from' => array( 'required' => false, 'type' => 'string' ),
					'to'   => array( 'required' => false, 'type' => 'string' ),
				),
			)
		);

		// Ensure ranges have groupName set (populate missing values)
		register_rest_route(
			'urbana/v1',
			'/product-data/populate-range-group-names',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'populate_range_group_names' ),
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

		// General settings endpoints
		register_rest_route(
			'urbana/v1',
			'/general-settings',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_general_settings' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		register_rest_route(
			'urbana/v1',
			'/general-settings',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'update_general_settings' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
			)
		);

		register_rest_route(
			'urbana/v1',
			'/proxy-download',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'proxy_download' ),
				'permission_callback' => '__return_true', // Public endpoint
			)
		);

		// NOTE: removed simple test endpoint for production builds.

		// Image proxy endpoint
		register_rest_route(
			'urbana/v1',
			'/image-proxy',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'image_proxy' ),
				'permission_callback' => '__return_true', // Public endpoint
				'args'                => array(
					'imageUrl' => array(
						'required' => false,
						'type'     => 'string',
					),
					'image_path' => array(
						'required' => false,
						'type'     => 'string',
					),
				),
			)
		);

		// Digital Ocean check folders endpoint
		register_rest_route(
			'urbana/v1',
			'/digital-ocean/check-folders',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'check_do_folders' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
				'args'                => array(
					'folders' => array(
						'required' => false,
						'type'     => 'array',
					),
					'type' => array(
						'required' => false,
						'type'     => 'string',
					),
				),
			)
		);

		// Create group folders endpoint (accepts group_ids or group_names)

		// Dry-run scan for mismatched folders (ranges/groups/products) and suggestions
		register_rest_route(
			'urbana/v1',
			'/digital-ocean/scan-mismatches',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'scan_do_mismatches' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
				'args'                => array(
					'type' => array(
						'required' => false,
						'type'     => 'string',
					),
					'force_refresh' => array(
						'required' => false,
						'type'     => 'boolean',
					),
				),
			)
		);
		register_rest_route(
			'urbana/v1',
			'/digital-ocean/create-group-folders',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_group_folders' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
				'args'                => array(
					'group_ids' => array(
						'required' => false,
						'type'     => 'array',
					),
					'group_names' => array(
						'required' => false,
						'type'     => 'array',
					),
					'base_path' => array(
						'required' => false,
						'type'     => 'string',
					),
				),
			)
		);

		// Create range folders endpoint (accepts range_ids or range_names)
		register_rest_route(
			'urbana/v1',
			'/digital-ocean/create-range-folders',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_range_folders' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
				'args'                => array(
					'range_ids' => array(
						'required' => false,
						'type'     => 'array',
					),
					'range_names' => array(
						'required' => false,
						'type'     => 'array',
					),
					'base_path' => array(
						'required' => false,
						'type'     => 'string',
					),
				),
			)
		);

		// Create product folders endpoint (accepts product_ids)
		register_rest_route(
			'urbana/v1',
			'/digital-ocean/create-product-folders',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_product_folders' ),
				'permission_callback' => array( $this, 'check_admin_permission' ),
				'args'                => array(
					'product_ids' => array(
						'required' => true,
						'type'     => 'array',
					),
					'base_path' => array(
						'required' => false,
						'type'     => 'string',
					),
				),
			)
		);
	}

	public function submit_form( $request ) {
		// error_log('Checkpoint: Inside submit_form method');
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

		// Server-side diagnostic logging when debug mode is enabled
		$debug_mode = (bool) get_option( 'urbana_debug_mode', false );
		if ( $debug_mode ) {
			error_log( 'Urbana REST: submit_form called. Submission saved with ID: ' . $submission_id );
			error_log( 'Urbana REST: submission_data: ' . print_r( $submission_data, true ) );
		}

		// Include debug payload only when plugin debug mode is enabled
		$response_payload = array(
			'success' => true,
			'id'      => $submission_id,
		);
		if ( $debug_mode ) {
			$response_payload['debug'] = array(
				'receivedAt'  => $submitted_at,
				'sanitized'   => $submission_data,
			);
		}

		return new \WP_REST_Response( $response_payload, 201 );
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
        
		// Check for status parameter
		if ( $request->has_param( 'status' ) ) {
			$data['status'] = sanitize_text_field( $request->get_param( 'status' ) );
		}
        
		// Check for priority parameter
		if ( $request->has_param( 'priority' ) ) {
			$data['priority'] = sanitize_text_field( $request->get_param( 'priority' ) );
		}
        
		// Check for notes parameter
		if ( $request->has_param( 'notes' ) ) {
			$data['notes'] = sanitize_textarea_field( $request->get_param( 'notes' ) );
		}
        
		// Update submission in the database
		$result = $this->db_manager->update_submission( $id, $data );
        
		if ( $result === false ) {
			return new \WP_Error( 'update_failed', 'Failed to update submission', array( 'status' => 500 ) );
		}
        
		return new \WP_REST_Response( array( 'success' => true ) );

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

		// Ensure proxy_download is closed before starting image_proxy
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

				} else {
					$errors[] = 'Failed to create images folder: ' . $structure['imagesPath'] . ' (Full path: ' . $images_path . ')';
				}
			}

			// Create downloads folder
			if ( ! file_exists( $downloads_path ) ) {
				if ( wp_mkdir_p( $downloads_path ) ) {
					$created_folders[] = $structure['downloadsPath'];

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

		// Include reverse sync settings so the admin UI can read and update them
		$config['reverse_sync'] = array(
			'enabled' => (bool) get_option( 'urbana_do_reverse_sync_enabled', false ),
			'base_path' => (string) get_option( 'urbana_do_reverse_sync_base_path', '' ),
			'auto_create_group_folders' => (bool) get_option( 'urbana_do_auto_create_group_folders', true ),
			'auto_create_range_folders' => (bool) get_option( 'urbana_do_auto_create_range_folders', true ),
			'auto_create_product_folders' => (bool) get_option( 'urbana_do_auto_create_product_folders', true ),
			'preserve_folder_case' => (bool) get_option( 'urbana_do_preserve_folder_case', false ),
		);

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

		// Support saving reverse sync options from frontend
		if ( isset( $data['reverse_sync'] ) && is_array( $data['reverse_sync'] ) ) {
			$rs = $data['reverse_sync'];
			if ( isset( $rs['enabled'] ) ) {
				update_option( 'urbana_do_reverse_sync_enabled', (bool) $rs['enabled'] );
			}
			if ( isset( $rs['base_path'] ) ) {
				update_option( 'urbana_do_reverse_sync_base_path', sanitize_text_field( $rs['base_path'] ) );
			}
			if ( isset( $rs['auto_create_group_folders'] ) ) {
				update_option( 'urbana_do_auto_create_group_folders', (bool) $rs['auto_create_group_folders'] );
			}
			if ( isset( $rs['auto_create_range_folders'] ) ) {
				update_option( 'urbana_do_auto_create_range_folders', (bool) $rs['auto_create_range_folders'] );
			}
			if ( isset( $rs['auto_create_product_folders'] ) ) {
				update_option( 'urbana_do_auto_create_product_folders', (bool) $rs['auto_create_product_folders'] );
			}
			if ( isset( $rs['preserve_folder_case'] ) ) {
				update_option( 'urbana_do_preserve_folder_case', (bool) $rs['preserve_folder_case'] );
			}
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => 'Configuration updated successfully',
			)
		);
	}

	/**
	 * Get general plugin settings
	 */
	public function get_general_settings( $request ) {
		$settings = array(
			'email_notifications' => (bool) get_option( 'urbana_email_notifications', true ),
			'auto_save' => (bool) get_option( 'urbana_auto_save', true ),
			'debug_mode' => (bool) get_option( 'urbana_debug_mode', false ),
		);

		return rest_ensure_response( $settings );
	}

	/**
	 * Update general plugin settings
	 */
	public function update_general_settings( $request ) {
		$data = $request->get_json_params();

		if ( isset( $data['email_notifications'] ) ) {
			update_option( 'urbana_email_notifications', (bool) $data['email_notifications'] );
		}

		if ( isset( $data['auto_save'] ) ) {
			update_option( 'urbana_auto_save', (bool) $data['auto_save'] );
		}

		if ( isset( $data['debug_mode'] ) ) {
			update_option( 'urbana_debug_mode', (bool) $data['debug_mode'] );
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => 'General settings updated successfully',
			)
		);
	}

	public function proxy_download( $request ) {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log('Checkpoint: Inside proxy_download method');
		}
		$file_url = $request->get_param( 'url' );
		$file_path = $request->get_param( 'path' );

		if ( empty( $file_url ) && empty( $file_path ) ) {
			return new \WP_Error( 'invalid_params', 'File URL or path is required', array( 'status' => 400 ) );
		}

		// If path param provided, fetch via DigitalOcean SDK wrapper
		if ( ! empty( $file_path ) ) {
			$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();
			if ( ! $do_spaces->is_configured() ) {
				return new \WP_Error( 'do_not_configured', 'Digital Ocean Spaces not configured', array( 'status' => 400 ) );
			}

			$file_data = $do_spaces->fetch_private_file( $file_path );

			if ( ! $file_data || ! isset( $file_data['success'] ) || ! $file_data['success'] ) {
				return new \WP_Error( 'fetch_failed', 'Failed to fetch file: ' . ( $file_data['error'] ?? 'Unknown' ), array( 'status' => 404 ) );
			}

			$status_code = 200;
			$file_content   = $file_data['data'];
			$content_type   = $file_data['content_type'] ?? 'application/octet-stream';
			$content_length = strlen( $file_content );
			$filename       = basename( $file_path );
		} else {
			// Validate URL is from Digital Ocean Spaces
			$parsed_url = parse_url( $file_url );
			if ( ! $parsed_url || ! str_contains( $parsed_url['host'], 'digitaloceanspaces.com' ) ) {
				return new \WP_Error( 'invalid_source', 'Only Digital Ocean Spaces URLs are allowed', array( 'status' => 403 ) );
			}

			// Fetch the file with streaming
			$response = wp_remote_get(
				$file_url,
				array(
					'timeout'     => 300,
					'redirection' => 5,
					'httpversion' => '1.1',
					'blocking'    => true,
					'sslverify'   => true,
				)
			);

			if ( is_wp_error( $response ) ) {
				wp_send_json_error(
					array(
						'message' => 'Download failed: ' . $response->get_error_message(),
					),
					500
				);
				exit;
			}

			$status_code = wp_remote_retrieve_response_code( $response );
			if ( $status_code !== 200 ) {
				wp_send_json_error(
					array(
						'message' => 'Failed to fetch file. Status: ' . $status_code,
					),
					$status_code
				);
				exit;
			}
			// Get file content and metadata
			$file_content   = wp_remote_retrieve_body( $response );
			$content_type   = wp_remote_retrieve_header( $response, 'content-type' );
			$content_length = wp_remote_retrieve_header( $response, 'content-length' );
			$filename       = basename( $parsed_url['path'] );

			// Validate we got content
			if ( empty( $file_content ) ) {
				wp_send_json_error(
					array(
						'message' => 'File content is empty',
					),
					500
				);
				exit;
			}

			// Clear all output buffers
			while ( ob_get_level() ) {
				ob_end_clean();
			}

			// Prevent any other output
			if ( ! headers_sent() ) {
				// Set headers for file download
				status_header( 200 );
				nocache_headers();

				header( 'Content-Type: ' . ( $content_type ?: 'application/octet-stream' ) );
				header( 'Content-Disposition: attachment; filename="' . sanitize_file_name( $filename ) . '"' );
				header( 'Content-Length: ' . ( $content_length ?: strlen( $file_content ) ) );
				header( 'Content-Transfer-Encoding: binary' );
				header( 'Accept-Ranges: bytes' );
				header( 'Cache-Control: private, must-revalidate' );
				header( 'Pragma: public' );
				header( 'Expires: 0' );
			}

			// Output the file content
			echo $file_content;

			// Flush output and exit
			if ( function_exists( 'fastcgi_finish_request' ) ) {
				fastcgi_finish_request();
			}

			exit;
		}
		// Validate URL is from Digital Ocean Spaces
		$parsed_url = parse_url( $file_url );
		if ( ! $parsed_url || ! str_contains( $parsed_url['host'], 'digitaloceanspaces.com' ) ) {
			return new \WP_Error( 'invalid_source', 'Only Digital Ocean Spaces URLs are allowed', array( 'status' => 403 ) );
		}

		// Fetch the file with streaming
		$response = wp_remote_get(
			$file_url,
			array(
				'timeout'     => 300,
				'redirection' => 5,
				'httpversion' => '1.1',
				'blocking'    => true,
				'sslverify'   => true,
			)
		);

		if ( is_wp_error( $response ) ) {
			wp_send_json_error(
				array(
					'message' => 'Download failed: ' . $response->get_error_message(),
				),
				500
			);
			exit;
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		if ( $status_code !== 200 ) {
			wp_send_json_error(
				array(
					'message' => 'Failed to fetch file. Status: ' . $status_code,
				),
				$status_code
			);
			exit;
		}
		// Get file content and metadata
		$file_content   = wp_remote_retrieve_body( $response );
		$content_type   = wp_remote_retrieve_header( $response, 'content-type' );
		$content_length = wp_remote_retrieve_header( $response, 'content-length' );
		$filename       = basename( $parsed_url['path'] );

		// Validate we got content
		if ( empty( $file_content ) ) {
			wp_send_json_error(
				array(
					'message' => 'File content is empty',
				),
				500
			);
			exit;
		}

		// Clear all output buffers
		while ( ob_get_level() ) {
			ob_end_clean();
		}

		// Prevent any other output
		if ( ! headers_sent() ) {
			// Set headers for file download
			status_header( 200 );
			nocache_headers();

			header( 'Content-Type: ' . ( $content_type ?: 'application/octet-stream' ) );
			header( 'Content-Disposition: attachment; filename="' . sanitize_file_name( $filename ) . '"' );
			header( 'Content-Length: ' . ( $content_length ?: strlen( $file_content ) ) );
			header( 'Content-Transfer-Encoding: binary' );
			header( 'Accept-Ranges: bytes' );
			header( 'Cache-Control: private, must-revalidate' );
			header( 'Pragma: public' );
			header( 'Expires: 0' );
		}

		// Output the file content
		echo $file_content;

		// Flush output and exit
		if ( function_exists( 'fastcgi_finish_request' ) ) {
			fastcgi_finish_request();
		}

		exit;
	}

	/**
	 * Image proxy endpoint to securely serve private Digital Ocean Spaces images
	 */

	/**
	 * Admin-only migration: change a stored group name across stepper_data_builder_* records
	 * Example: from='Shelter' to='Shelters'
	 */
	public function migrate_group_name_in_db( $request ) {
		if ( ! $this->check_admin_permission() ) {
			return new \WP_Error( 'unauthorized', 'Unauthorized', array( 'status' => 403 ) );
		}

		$from = $request->get_param( 'from' );
		$to   = $request->get_param( 'to' );

		$from = is_string( $from ) && $from !== '' ? sanitize_text_field( $from ) : 'Shelter';
		$to   = is_string( $to ) && $to !== '' ? sanitize_text_field( $to ) : 'Shelters';

		if ( $from === $to ) {
			return new \WP_Error( 'invalid_params', 'from and to must be different', array( 'status' => 400 ) );
		}

		$keys = $this->db_manager->get_product_data_keys_by_prefix( 'stepper_data_builder_' );
		if ( empty( $keys ) ) {
			return new \WP_Error( 'no_builder_data', 'No builder data found to migrate', array( 'status' => 404 ) );
		}

		$migration_report = array();

		foreach ( $keys as $key ) {
			$data = $this->db_manager->get_product_data( null, $key );
			if ( ! is_array( $data ) ) {
				continue;
			}

			// Backup original object
			$ts = date( 'Ymd_His' );
			$backup_key = $key . '_backup_before_migrate_' . $ts;
			$this->db_manager->update_product_data( $backup_key, $data );

			$changed = false;
			$counts = array( 'groups_renamed' => 0, 'ranges_updated' => 0, 'products_updated' => 0, 'relationships_moved' => 0, 'groups_removed' => 0 );

			// Find group indices and IDs
			$old_group_idx = null; $new_group_idx = null;
			$old_group_id = null; $new_group_id = null;
			if ( isset( $data['productGroups'] ) && is_array( $data['productGroups'] ) ) {
				foreach ( $data['productGroups'] as $i => $g ) {
					if ( isset( $g['name'] ) ) {
						if ( $g['name'] === $from ) {
							$old_group_idx = $i;
							if ( isset( $g['id'] ) ) $old_group_id = $g['id'];
						}
						if ( $g['name'] === $to ) {
							$new_group_idx = $i;
							if ( isset( $g['id'] ) ) $new_group_id = $g['id'];
						}
					}
				}
			}

			// If old group exists and new doesn't, just rename
			if ( null !== $old_group_idx && null === $new_group_idx ) {
				$data['productGroups'][ $old_group_idx ]['name'] = $to;
				$changed = true;
				$counts['groups_renamed']++;
				// update indices for further logic
				$new_group_idx = $old_group_idx;
				$new_group_id = isset( $data['productGroups'][ $new_group_idx ]['id'] ) ? $data['productGroups'][ $new_group_idx ]['id'] : null;
				$old_group_idx = null; // mark as handled
				$old_group_id = null;
			}

			// If both exist, we'll merge content from old -> new and remove old
			if ( null !== $old_group_idx && null !== $new_group_idx ) {
				// Move ranges from old group ranges list (if present) to new group
				if ( isset( $data['productGroups'][ $old_group_idx ]['ranges'] ) && is_array( $data['productGroups'][ $old_group_idx ]['ranges'] ) ) {
					if ( ! isset( $data['productGroups'][ $new_group_idx ]['ranges'] ) || ! is_array( $data['productGroups'][ $new_group_idx ]['ranges'] ) ) {
						$data['productGroups'][ $new_group_idx ]['ranges'] = array();
					}
					$moved_count = 0;
					foreach ( $data['productGroups'][ $old_group_idx ]['ranges'] as $r ) {
						if ( ! in_array( $r, $data['productGroups'][ $new_group_idx ]['ranges'], true ) ) {
							$data['productGroups'][ $new_group_idx ]['ranges'][] = $r;
							$moved_count++;
						}
					}
					if ( $moved_count > 0 ) {
						$changed = true;
						$counts['relationships_moved'] += $moved_count;
					}
				}

				// Move relationships.groupToRanges entries
				if ( isset( $data['relationships'] ) && isset( $data['relationships']['groupToRanges'] ) && is_array( $data['relationships']['groupToRanges'] ) ) {
					$gtr = $data['relationships']['groupToRanges'];
					if ( $old_group_id && isset( $gtr[ $old_group_id ] ) ) {
						if ( ! isset( $gtr[ $new_group_id ] ) ) {
							$gtr[ $new_group_id ] = array();
						}
						foreach ( $gtr[ $old_group_id ] as $rid ) {
							if ( ! in_array( $rid, $gtr[ $new_group_id ], true ) ) {
								$gtr[ $new_group_id ][] = $rid;
								$counts['relationships_moved']++;
							}
						}
						unset( $gtr[ $old_group_id ] );
						$data['relationships']['groupToRanges'] = $gtr;
						$changed = true;
					}
				}

				// Remove old group from productGroups
				if ( isset( $data['productGroups'][ $old_group_idx ] ) ) {
					array_splice( $data['productGroups'], $old_group_idx, 1 );
					$changed = true;
					$counts['groups_removed']++;
				}
			}

			// Update any productRanges.groupName fields still pointing at $from
			if ( isset( $data['productRanges'] ) && is_array( $data['productRanges'] ) ) {
				foreach ( $data['productRanges'] as &$r ) {
					if ( isset( $r['groupName'] ) && $r['groupName'] === $from ) {
						$r['groupName'] = $to;
						$changed = true;
						$counts['ranges_updated']++;
					}
				}
				unset( $r );
			}

			// Update any products' groupName
			if ( isset( $data['products'] ) && is_array( $data['products'] ) ) {
				foreach ( $data['products'] as &$p ) {
					if ( isset( $p['groupName'] ) && $p['groupName'] === $from ) {
						$p['groupName'] = $to;
						$changed = true;
						$counts['products_updated']++;
					}
				}
				unset( $p );
			}

			if ( $changed ) {
				// Save updated builder data back to DB
				$this->db_manager->update_product_data( $key, $data );
			}

			$migration_report[ $key ] = array( 'changed' => $changed, 'counts' => $counts, 'backup_key' => $backup_key );
		}

		return rest_ensure_response( array( 'success' => true, 'from' => $from, 'to' => $to, 'report' => $migration_report ) );
	}

	/**
	 * Populate missing `groupName` fields on productRanges in builder data
	 * Scans stepper_data_builder_* keys and tries to find parent group for each range
	 */
	public function populate_range_group_names( $request ) {
		if ( ! $this->check_admin_permission() ) {
			return new \WP_Error( 'unauthorized', 'Unauthorized', array( 'status' => 403 ) );
		}

		$keys = $this->db_manager->get_product_data_keys_by_prefix( 'stepper_data_builder_' );
		if ( empty( $keys ) ) {
			return new \WP_Error( 'no_builder_data', 'No builder data found', array( 'status' => 404 ) );
		}

		$report = array();

		foreach ( $keys as $key ) {
			$data = $this->db_manager->get_product_data( null, $key );
			if ( ! is_array( $data ) ) {
				continue;
			}

			// Backup before editing
			$ts = date( 'Ymd_His' );
			$backup_key = $key . '_backup_before_populate_' . $ts;
			$this->db_manager->update_product_data( $backup_key, $data );

			$changes = array( 'ranges_set' => 0 );
			$changed = false;

			// Build a map: range_id -> group_name via productGroups and relationships
			$rangeToGroup = array();

			if ( isset( $data['productGroups'] ) && is_array( $data['productGroups'] ) ) {
				foreach ( $data['productGroups'] as $group ) {
					$gname = isset( $group['name'] ) ? $group['name'] : '';
					if ( isset( $group['ranges'] ) && is_array( $group['ranges'] ) ) {
						foreach ( $group['ranges'] as $r ) {
							if ( is_array( $r ) && isset( $r['id'] ) ) {
								$rangeToGroup[ $r['id'] ] = $gname;
							} elseif ( is_string( $r ) ) {
								// Find matching range by name
								// We'll map by name later if needed
							}
						}
					}
				}
			}

			// Also chase relationships.groupToRanges mapping
			if ( isset( $data['relationships'] ) && isset( $data['relationships']['groupToRanges'] ) ) {
				$gtr = $data['relationships']['groupToRanges'];
				if ( is_array( $gtr ) ) {
					foreach ( $gtr as $groupId => $rids ) {
						// find group name by id
						$gname = null;
						if ( isset( $data['productGroups'] ) && is_array( $data['productGroups'] ) ) {
							foreach ( $data['productGroups'] as $group ) {
								if ( isset( $group['id'] ) && $group['id'] === $groupId ) {
									$gname = isset( $group['name'] ) ? $group['name'] : null;
									break;
								}
							}
						}
						if ( $gname && is_array( $rids ) ) {
							foreach ( $rids as $rid ) {
								if ( ! isset( $rangeToGroup[ $rid ] ) ) {
									$rangeToGroup[ $rid ] = $gname;
								}
							}
						}
					}
				}
			}

			// Finally, attempt to map by range name if map still incomplete
			if ( isset( $data['productRanges'] ) && is_array( $data['productRanges'] ) ) {
				// Build range name -> id map
				$nameToRangeId = array();
				foreach ( $data['productRanges'] as $range ) {
					if ( isset( $range['id'] ) && isset( $range['name'] ) ) {
						$nameToRangeId[ $range['name'] ] = $range['id'];
					}
				}
				if ( isset( $data['productGroups'] ) && is_array( $data['productGroups'] ) ) {
					foreach ( $data['productGroups'] as $group ) {
						if ( isset( $group['ranges'] ) && is_array( $group['ranges'] ) ) {
							foreach ( $group['ranges'] as $r ) {
								if ( is_string( $r ) && isset( $nameToRangeId[ $r ] ) ) {
									$rangeToGroup[ $nameToRangeId[ $r ] ] = $group['name'];
								} elseif ( is_array( $r ) && isset( $r['id'] ) && isset( $r['name'] ) ) {
									$rangeToGroup[ $r['id'] ] = $group['name'];
								}
							}
						}
					}
				}
			}

			// Apply mapping to ranges missing groupName
			if ( isset( $data['productRanges'] ) && is_array( $data['productRanges'] ) ) {
				foreach ( $data['productRanges'] as &$range ) {
					if ( ! isset( $range['groupName'] ) || empty( $range['groupName'] ) ) {
						$rid = isset( $range['id'] ) ? $range['id'] : null;
						if ( $rid && isset( $rangeToGroup[ $rid ] ) ) {
							$range['groupName'] = $rangeToGroup[ $rid ];
							$changed = true;
							$changes['ranges_set']++;
						}
					}
				}
				unset( $range );
			}

			if ( $changed ) {
				$this->db_manager->update_product_data( $key, $data );
			}

			$report[ $key ] = array( 'changed' => $changed, 'changes' => $changes, 'backup_key' => $backup_key );
		}

		return rest_ensure_response( array( 'success' => true, 'report' => $report ) );
	}
	public function image_proxy( $request ) {
		$debug_mode = (bool) get_option( 'urbana_debug_mode', false );
		
		if ( $debug_mode ) {
			error_log('Checkpoint: Inside image_proxy method');
		}
		// Accept both 'imageUrl' and 'image_path' for backward compatibility
		$image_path = $request->get_param( 'imageUrl' ) ?: $request->get_param( 'image_path' );
		
		if ( empty( $image_path ) ) {
			if ( $debug_mode ) {
				error_log('DigitalOcean: Missing image path or URL');
			}
			return new \WP_Error( 'missing_path', 'Image path is required', array( 'status' => 400 ) );
		}

		if ( $debug_mode ) {
			error_log('DigitalOcean: Received image_path: ' . $image_path);
		}

		// Initialize Digital Ocean Spaces utility
		$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();
		
		if ( ! $do_spaces->is_configured() ) {
			if ( $debug_mode ) {
				error_log('DigitalOcean: Spaces not configured');
			}
			return new \WP_Error( 'do_not_configured', 'Digital Ocean Spaces not configured', array( 'status' => 400 ) );
		}

		// Clean the path - remove any existing URLs and extract just the path
		if ( filter_var( $image_path, FILTER_VALIDATE_URL ) ) {
			// Extract path from full URL
			$parsed = parse_url( $image_path );
			if ( isset( $parsed['path'] ) ) {
				$image_path = ltrim( $parsed['path'], '/' );
				
				// Get config to know bucket name
				$config = $do_spaces->get_configuration();
				$bucket_name = $config['bucket_name'];
				
				// Remove bucket name if it's in the path (for some DO URLs)
				if ( strpos( $image_path, $bucket_name . '/' ) === 0 ) {
					$image_path = substr( $image_path, strlen( $bucket_name ) + 1 );
				}
				
				if ( $debug_mode ) {
					error_log('DigitalOcean: Extracted path from URL: ' . $image_path);
				}
			}
		}

		// Ensure path doesn't start with / and decode any URL encoding
		$image_path = ltrim( $image_path, '/' );
		$image_path = urldecode( $image_path );

		if ( $debug_mode ) {
			error_log('DigitalOcean: Final image_path for processing: ' . $image_path);
		}

		try {
			// First, try to generate a presigned URL (fast method - no data transfer)
			if ( $debug_mode ) {
				error_log( 'DigitalOcean: Attempting to generate presigned URL for: ' . $image_path );
			}
			
			$presigned_result = $do_spaces->generate_presigned_url( $image_path, 3600 );
			
			if ( $presigned_result && isset( $presigned_result['success'] ) && $presigned_result['success'] ) {
				// Successfully generated presigned URL
				if ( $debug_mode ) {
					error_log( 'DigitalOcean: Presigned URL generated successfully' );
				}
				
				return new \WP_REST_Response(array(
					'success' => true,
					'method' => 'presigned_url',
					'image_url' => $presigned_result['url'],
					'expires_at' => $presigned_result['expires_at']
				), 200 );
			}
			
			// Fallback to base64 method if presigned URL fails
			$error_msg = isset( $presigned_result['error'] ) ? $presigned_result['error'] : 'Unknown error';
			error_log( 'DigitalOcean: Presigned URL generation failed, falling back to base64. Error: ' . $error_msg );
			
			$file_data = $do_spaces->fetch_private_file( $image_path );
			
			if ( ! $file_data || ! $file_data['success'] || ! isset( $file_data['data'] ) ) {
				$error_msg = isset( $file_data['error'] ) ? $file_data['error'] : 'Image not found or inaccessible';
				error_log( 'DigitalOcean: Base64 fallback also failed. Error: ' . $error_msg );
				
				// Return response indicating fallback to SVG icon
				return new \WP_REST_Response(array(
					'success' => false,
					'method' => 'failed',
					'error' => $error_msg,
					'use_svg_icon' => true
				), 200 );
			}

			$body = $file_data['data'];
			$content_type = isset( $file_data['content_type'] ) ? $file_data['content_type'] : 'image/jpeg';

			// Validate it's an image
			if ( ! str_starts_with( $content_type, 'image/' ) ) {
				error_log( 'DigitalOcean: File is not an image. Content-Type: ' . $content_type );
				
				// Return response indicating fallback to SVG icon
				return new \WP_REST_Response(array(
					'success' => false,
					'method' => 'failed',
					'error' => 'File is not an image',
					'use_svg_icon' => true
				), 200 );
			}

			// Return base64 encoded image data as fallback
			if (empty($body)) {
				error_log( 'DigitalOcean: Image data is empty' );
				
				return new \WP_REST_Response(array(
					'success' => false,
					'method' => 'failed',
					'error' => 'Image data is empty',
					'use_svg_icon' => true
				), 200 );
			}

			error_log( 'DigitalOcean: Using base64 fallback method for image. Size: ' . strlen( $body ) . ' bytes' );
			$base64_image = 'data:' . $content_type . ';base64,' . base64_encode($body);

			return new \WP_REST_Response(array(
				'success' => true,
				'method' => 'base64_fallback',
				'image_data' => $base64_image,
				'content_type' => $content_type
			), 200 );

		} catch ( Exception $e ) {
			error_log( 'DigitalOcean: Exception in image_proxy: ' . $e->getMessage() );
			
			// Return response indicating fallback to SVG icon on exception
			return new \WP_REST_Response(array(
				'success' => false,
				'method' => 'failed',
				'error' => 'Failed to fetch image: ' . $e->getMessage(),
				'use_svg_icon' => true
			), 200 );
		}
	}

	/**
	 * Check Digital Ocean folders endpoint
	 */
	public function check_do_folders( $request ) {
		$folders = $request->get_param( 'folders' );
		$type = $request->get_param( 'type' );
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log('GOD_DEBUG: check_do_folders called with type=' . print_r($type, true) . ' folders=' . print_r($folders, true));
		}
		// If type is provided but no folders array, generate folders based on type
		if ( empty( $folders ) && ! empty( $type ) ) {
			$folders = $this->get_folders_by_type( $type );
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				error_log('GOD_DEBUG: get_folders_by_type(' . $type . ') returned: ' . print_r($folders, true));
			}
		}
		if ( empty( $folders ) || ! is_array( $folders ) ) {
			return new \WP_Error( 'missing_folders', 'Folders array or type is required', array( 'status' => 400 ) );
		}
		$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();
		$results = array();
		$debug_info = array();
		foreach ( $folders as $folder ) {
			   try {
				   $folder_debug = array();
				// Handle both simple folder paths and complex structures with ID mapping
				if ( is_array( $folder ) && isset( $folder['id'] ) && isset( $folder['folder_path'] ) ) {
					$folder_id = $folder['id'];
					$folder_path = sanitize_text_field( $folder['folder_path'] );
				} else {
					$folder_id = sanitize_text_field( $folder );
					$folder_path = sanitize_text_field( $folder );
				}
				   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
					   error_log('GOD_DEBUG: About to check folder: id=' . $folder_id . ' path=' . $folder_path);
				   }
				   // Check if folder exists and get its contents
				   $folder_exists = $do_spaces->folder_exists( $folder_path, $folder_debug );
				   $file_count = 0;

				   // If not found and a base path is configured, try the prefixed location
				   $base_path = trim( get_option( 'urbana_do_reverse_sync_base_path', '' ), " \t\n\r\/" );
				   $used_folder_path = $folder_path;
				   if ( ! $folder_exists && ! empty( $base_path ) ) {
					   $prefixed = rtrim( $base_path, '/' ) . '/' . ltrim( $folder_path, '/' );
					   // try prefixed path
					   if ( $do_spaces->folder_exists( $prefixed, $folder_debug ) ) {
						   $folder_exists = true;
						   $used_folder_path = $prefixed;
					   }
				   }

				   if ( $folder_exists ) {
					   $files = $do_spaces->list_files( $used_folder_path );
					   $file_count = is_array( $files ) ? count( $files ) : 0;
				   }
				   // Debug logging for troubleshooting
				   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
					   error_log('GOD_DEBUG: Folder check result: ID=' . $folder_id . ' | Path=' . $folder_path . ' | Exists=' . ($folder_exists ? 'true' : 'false') . ' | FileCount=' . $file_count);
				   }
				   $results[] = array(
					   'id' => $folder_id,
					   'exists' => $folder_exists,
					   'fileCount' => $file_count,
					   'status' => $folder_exists ? 'found' : 'not_found',
					   // Keep camelCase for historical compatibility and add snake_case for frontend lookups
					   'folderPath' => $used_folder_path,
					   'folder_path' => $used_folder_path // Include the actual path for debugging (snake_case)
				   );
				   $debug_info[] = array(
					   'id' => $folder_id,
					   'path' => $folder_path,
					   'debug' => $folder_debug
				   );
			} catch ( Exception $e ) {
				$results[] = array(
					'id' => $folder_id,
					'exists' => false,
					'fileCount' => 0,
					'status' => 'error',
					'error' => $e->getMessage(),
					'folderPath' => $folder_path,
					'folder_path' => $folder_path
				);
			}
		}
		   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			   error_log('GOD_DEBUG: check_do_folders final results: ' . print_r($results, true));
		   }
		   return new \WP_REST_Response( array(
			   'success' => true,
			   'results' => $results,
			   'debug' => $debug_info
		   ), 200 );
	}

	/**
	 * Server-side dry-run scan to detect mismatched DigitalOcean folders for a given type
	 * Returns a detailed report for each expected folder path and suggested actions
	 */
	public function scan_do_mismatches( $request ) {
		$type = $request->get_param( 'type' ) ?: 'ranges';
		$force_refresh = $request->get_param( 'force_refresh' ) ?: false;

		$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();
		if ( ! $do_spaces->is_configured() ) {
			return new \WP_Error( 'do_not_configured', 'Digital Ocean Spaces not configured', array( 'status' => 400 ) );
		}

		// Use get_folders_by_type to determine what the plugin expects
		$expected = $this->get_folders_by_type( $type );

		// Respect configured reverse sync base path (may be empty).
		// Many setups keep assets under a base path like "assets/products" in DO;
		// when present we must look for both raw and base-prefixed folder names.
		$base_path = trim( get_option( 'urbana_do_reverse_sync_base_path', '' ), " \t\n\r\/" );

		// Fetch all folder names from DO (can be expensive) and optionally force refresh
		$all_folders = $do_spaces->list_all_folder_names( $force_refresh );
		// Normalize all_folders => no trailing slash, lowercased
		$normalized = array_map( function( $f ) {
			return rtrim( strtolower( $f ), '/');
		}, $all_folders );

		$report = array();

		foreach ( $expected as $expect ) {
			$expect_id = isset( $expect['id'] ) ? $expect['id'] : null;
			$expect_path = null;
			if ( is_array( $expect ) && isset( $expect['folder_path'] ) ) {
				$expect_path = rtrim( $expect['folder_path'], '/' );
			} else {
				// Fallback: cast to string
				$expect_path = rtrim( (string) $expect, '/' );
			}
			$expect_norm = strtolower( $expect_path );
			// build alternate candidate(s) including base path if configured
			$variants = array( $expect_norm );
			if ( ! empty( $base_path ) ) {
				$variants[] = strtolower( rtrim( $base_path, '/' ) . '/' . ltrim( $expect_path, '/' ) );
				// also check for trimmed base path + without trailing parts (e.g. when DO lists nested folders)
				$variants[] = strtolower( rtrim( $base_path, '/' ) . '/' . ltrim( $expect_norm, '/' ) );
			}

			// Try exact match
			// Try exact match across variants (fast lookup)
			$exact_idx = false;
			$exact_folder = null;
			foreach ( $variants as $v ) {
				$idx = array_search( $v, $normalized, true );
				if ( $idx !== false ) {
					$exact_idx = $idx;
					$exact_folder = $all_folders[ $idx ];
					break;
				}
			}
			$exact = false;
			$exact_folder = null;
			if ( $exact_idx !== false ) {
				$exact = true;
			}

			// Find candidate entries by range name or group name
			$parts = explode( '/', $expect_norm );
			$groupSegment = isset( $parts[0] ) ? $parts[0] : '';
			$rangeSegment = isset( $parts[1] ) ? $parts[1] : '';

			$candidates = array();
			foreach ( $normalized as $i => $nf ) {
				if ( $nf === $expect_norm || $nf === $expect_norm . '/' ) continue; // exact handled
				if ( $rangeSegment && strpos( $nf, $rangeSegment ) !== false ) {
					$path = $all_folders[ $i ];
					$files = $do_spaces->list_files( $path );
					$candidates[] = array(
						'path' => $path,
						'normalized' => $nf,
						'fileCount' => is_array( $files ) ? count( $files ) : 0,
					);
				}
			}

			// Also look for top-level range folder (e.g., 'banksia')
			$top_level_matches = array();
			if ( $rangeSegment ) {
				foreach ( $normalized as $i => $nf ) {
					$first = explode( '/', $nf )[0];
					if ( $first === $rangeSegment ) {
						$top_level_matches[] = $all_folders[ $i ];
					}
				}
			}

			// Pluralization heuristic (e.g. shelter vs shelters)
			$plural_suggestion = null;
			if ( $groupSegment ) {
				$alt = substr( $groupSegment, -1 ) === 's' ? substr( $groupSegment, 0, -1 ) : $groupSegment . 's';
				// look for any folder starting with alt
				foreach ( $normalized as $i => $nf ) {
					// match alt directly or under a possible base_path prefix
					if ( strpos( $nf, $alt . '/' ) === 0 || $nf === $alt || strpos( $nf, rtrim( strtolower( $base_path ), '/' ) . '/' . $alt ) === 0 ) {
						$plural_suggestion = $all_folders[ $i ];
						break;
					}
				}
			}

			// Build suggestion list
			$suggestions = array();
				if ( $exact ) {
					$suggestions[] = array( 'type' => 'ok', 'message' => 'Exact folder exists in DO', 'folder' => $exact_folder );
			} else {
					if ( ! empty( $top_level_matches ) ) {
						// Recommend actions: migrate DO folder into group/range path OR update DB to map to top-level
						$recommended_moves = array();
						foreach ( $top_level_matches as $p ) {
							$recommended_moves[] = array(
								'from' => $p,
								'to' => $groupSegment && $rangeSegment ? ( $groupSegment . '/' . $rangeSegment . '/' ) : null,
								'message' => 'Consider renaming/moving this DO folder into the expected group/range path or alter the stored groupName to match DO.'
							);
						}

						$suggestions[] = array( 'type' => 'top_level_match', 'message' => 'Top-level folder found with range name (assets may be in top-level instead of under group)', 'examples' => $top_level_matches, 'recommended' => $recommended_moves );
				}

				if ( ! empty( $candidates ) ) {
					$suggestions[] = array( 'type' => 'partial_matches', 'message' => 'Partial matches containing range or group name', 'examples' => $candidates );
				}

					if ( $plural_suggestion ) {
						// Suggest DB rename of group to match DO, or renaming DO to match site
						$suggestions[] = array( 'type' => 'pluralization', 'message' => 'Possibly a pluralization mismatch for group name (site vs DO)', 'example' => $plural_suggestion, 'recommended' => array(
							array('action' => 'db_rename_group', 'from' => $groupSegment, 'to' => substr( $groupSegment, -1 ) === 's' ? substr( $groupSegment, 0, -1 ) : $groupSegment . 's', 'message' => 'Change stored group name in DB to match DO (safe; will be applied across builder data with backups).' ),
							array('action' => 'do_rename_group', 'from' => $plural_suggestion, 'to' => $groupSegment . '/', 'message' => 'Rename DO top-level folder to match site group name.'),
						));
				}

				if ( empty( $candidates ) && empty( $top_level_matches ) && empty( $plural_suggestion ) ) {
					$suggestions[] = array( 'type' => 'not_found', 'message' => 'No matches found in DigitalOcean results for this expected path');
				}
			}

			$report[] = array(
				'id' => $expect_id,
				'expected' => $expect_path,
				'expected_normalized' => $expect_norm,
				'exact' => $exact,
				'exact_folder' => $exact_folder,
				'top_level_matches' => $top_level_matches,
				'candidates' => $candidates,
				'plural_suggestion' => $plural_suggestion,
				'suggestions' => $suggestions,
			);
		}

		return new \WP_REST_Response( array( 'success' => true, 'type' => $type, 'report' => $report, 'total_do_folders' => count( $all_folders ) ), 200 );
	}

	/**
	 * Create group folders for provided group IDs or names
	 */
	public function create_group_folders( $request ) {
		if ( ! $this->check_admin_permission() ) {
			return new \WP_Error( 'unauthorized', 'Unauthorized', array( 'status' => 403 ) );
		}

		$group_ids = $request->get_param( 'group_ids' );
		$group_names = $request->get_param( 'group_names' );
		$base_path = $request->get_param( 'base_path' ) ?: get_option( 'urbana_do_reverse_sync_base_path', '' );

		$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();
		if ( ! $do_spaces->is_configured() ) {
			return new \WP_Error( 'not_configured', 'Digital Ocean Spaces not configured', array( 'status' => 400 ) );
		}

		// Normalize requested list
		$groups = array();
		if ( is_array( $group_names ) && ! empty( $group_names ) ) {
			$groups = $group_names;
		}

		// If ids provided, map to names using the saved product data
		if ( is_array( $group_ids ) && ! empty( $group_ids ) ) {
			$product_data = $this->db_manager->get_product_data( null, 'stepper_data_builder_1' );
			if ( $product_data && isset( $product_data['productGroups'] ) ) {
				foreach ( $product_data['productGroups'] as $group ) {
					if ( in_array( $group['id'], $group_ids, true ) ) {
						$groups[] = $group['name'];
					}
				}
			}
		}

		if ( empty( $groups ) ) {
			return new \WP_Error( 'missing_groups', 'No group ids or names provided', array( 'status' => 400 ) );
		}

		$results = array();
		$success_count = 0;
		foreach ( $groups as $group_name ) {
			$result = $do_spaces->create_group_folders( $group_name, $base_path );
			$results[] = array( 'group' => $group_name, 'result' => $result );
			if ( isset( $result['success'] ) && $result['success'] ) {
				$success_count++;
			}
		}

		return rest_ensure_response( array( 'success' => $success_count > 0, 'message' => 'Group creation completed', 'results' => $results ) );
	}

	/**
	 * Create range folders for provided range IDs or names
	 */
	public function create_range_folders( $request ) {
		if ( ! $this->check_admin_permission() ) {
			return new \WP_Error( 'unauthorized', 'Unauthorized', array( 'status' => 403 ) );
		}

		$range_ids = $request->get_param( 'range_ids' );
		$range_names = $request->get_param( 'range_names' );
		$base_path = $request->get_param( 'base_path' ) ?: get_option( 'urbana_do_reverse_sync_base_path', '' );

		$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();
		if ( ! $do_spaces->is_configured() ) {
			return new \WP_Error( 'not_configured', 'Digital Ocean Spaces not configured', array( 'status' => 400 ) );
		}

		$ranges = array();

		if ( is_array( $range_names ) && ! empty( $range_names ) ) {
			$ranges = $range_names; // expecting full "Group/Range" strings or similar
		}

		if ( is_array( $range_ids ) && ! empty( $range_ids ) ) {
			$product_data = $this->db_manager->get_product_data( null, 'stepper_data_builder_1' );
			if ( $product_data && isset( $product_data['productRanges'] ) ) {
				foreach ( $product_data['productRanges'] as $range ) {
					if ( in_array( $range['id'], $range_ids, true ) ) {
						// Try to determine group name for this range
						$group_name = '';
						if ( isset( $range['groupName'] ) && ! empty( $range['groupName'] ) ) {
							$group_name = $range['groupName'];
						} else {
							// fallback - attempt find from productGroups
							if ( isset( $product_data['productGroups'] ) ) {
								foreach ( $product_data['productGroups'] as $group ) {
									if ( isset( $group['ranges'] ) && is_array( $group['ranges'] ) ) {
										foreach ( $group['ranges'] as $g_range ) {
											if ( ( is_array( $g_range ) && isset( $g_range['id'] ) && $g_range['id'] === $range['id'] ) || $g_range === $range['name'] ) {
												$group_name = $group['name'];
												break 3;
										}
									}
								}
							}
						}
					}
					$ranges[] = array( 'group' => $group_name, 'range' => $range['name'] );
				}
				}
			}
		}

		if ( empty( $ranges ) ) {
			return new \WP_Error( 'missing_ranges', 'No range ids or names provided', array( 'status' => 400 ) );
		}

		$results = array();
		$success_count = 0;
		foreach ( $ranges as $r ) {
			if ( is_array( $r ) ) {
				$group_name = $r['group'];
				$range_name = $r['range'];
			} else {
				// provided as string; try to split
				$parts = explode( '/', $r );
				$group_name = $parts[0] ?? '';
				$range_name = $parts[1] ?? ($parts[0] ?? '');
			}

			$result = $do_spaces->create_range_folders( $group_name, $range_name, $base_path );
			$results[] = array( 'group' => $group_name, 'range' => $range_name, 'result' => $result );
			if ( isset( $result['success'] ) && $result['success'] ) {
				$success_count++;
			}
		}

		return rest_ensure_response( array( 'success' => $success_count > 0, 'message' => 'Range creation completed', 'results' => $results ) );
	}

	/**
	 * Create product folders for provided product IDs
	 */
	public function create_product_folders( $request ) {
		if ( ! $this->check_admin_permission() ) {
			return new \WP_Error( 'unauthorized', 'Unauthorized', array( 'status' => 403 ) );
		}

		$product_ids = $request->get_param( 'product_ids' );
		$base_path = $request->get_param( 'base_path' ) ?: get_option( 'urbana_do_reverse_sync_base_path', '' );

		if ( ! is_array( $product_ids ) || empty( $product_ids ) ) {
			return new \WP_Error( 'missing_product_ids', 'product_ids required', array( 'status' => 400 ) );
		}

		$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();
		if ( ! $do_spaces->is_configured() ) {
			return new \WP_Error( 'not_configured', 'Digital Ocean Spaces not configured', array( 'status' => 400 ) );
		}

		$product_data = $this->db_manager->get_product_data( null, 'stepper_data_builder_1' );
		$products = isset( $product_data['products'] ) ? $product_data['products'] : array();

		$results = array();
		$success_count = 0;

		foreach ( $product_ids as $pid ) {
			$found = null;
			foreach ( $products as $product ) {
				if ( isset( $product['id'] ) && $product['id'] === $pid ) {
					$found = $product;
					break;
				}
			}

			if ( ! $found ) {
				// If product not found by id, allow product code string
				foreach ( $products as $product ) {
					if ( isset( $product['code'] ) && $product['code'] === $pid ) {
						$found = $product;
						break;
					}
				}
			}

			if ( ! $found ) {
				$results[] = array( 'id' => $pid, 'success' => false, 'message' => 'Product not found' );
				continue;
			}

			$group = isset( $found['groupName'] ) ? $found['groupName'] : ( isset($found['group']) ? $found['group'] : '' );
			$range = isset( $found['rangeName'] ) ? $found['rangeName'] : ( isset($found['range']) ? $found['range'] : '' );
			$code = isset( $found['code'] ) ? $found['code'] : ( isset($found['name']) ? $found['name'] : $pid );

			$result = $do_spaces->create_product_folders( $group, $range, $code, $base_path );
			$results[] = array( 'id' => $pid, 'group' => $group, 'range' => $range, 'code' => $code, 'result' => $result );
			if ( isset( $result['success'] ) && $result['success'] ) {
				$success_count++;
			}
		}

		return rest_ensure_response( array( 'success' => $success_count > 0, 'message' => 'Product folder creation completed', 'results' => $results ) );
	}

	/**
	 * Get folders based on type from database
	 */
	private function get_folders_by_type( $type ) {
		$folders = array();
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log('GOD_DEBUG: get_folders_by_type called with type=' . $type);
		}
		$product_data = $this->db_manager->get_product_data( null, 'stepper_data_builder_1' );
		// Build lookup tables for group/range relationships
		$rangeIdToGroup = array();
		$productIdToRange = array();
		$productIdToGroup = array();
		if ($product_data && isset($product_data['productRanges'])) {
			foreach ($product_data['productRanges'] as $range) {
				if (isset($range['id'], $range['groupName'])) {
					$rangeIdToGroup[$range['id']] = $range['groupName'];
				}
			}
		}
		if ($product_data && isset($product_data['products'])) {
			foreach ($product_data['products'] as $product) {
				if (isset($product['id'], $product['rangeName'])) {
					$productIdToRange[$product['id']] = $product['rangeName'];
				}
				if (isset($product['id'], $product['groupName'])) {
					$productIdToGroup[$product['id']] = $product['groupName'];
				}
			}
		}
		switch ( $type ) {
			case 'groups':
				if ( $product_data && isset( $product_data['productGroups'] ) ) {
					// Get all actual folder names from Spaces (top-level only)
					$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();
					$all_folders = $do_spaces->list_all_folder_names();
					// Only keep top-level folders
					$top_level_folders = array();
					foreach ($all_folders as $folder) {
						$parts = explode('/', $folder);
						if (count($parts) === 1 || (count($parts) === 2 && $parts[1] === '')) {
							$top_level_folders[] = rtrim($parts[0], '/');
						}
					}
					foreach ( $product_data['productGroups'] as $group ) {
						if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
							error_log('GOD_DEBUG: group name=' . print_r($group['name'], true));
						}
						$group_name = rtrim($group['name'], '/');
						// Try to find a matching folder (case-insensitive)
						$matched = null;
						foreach ($top_level_folders as $folder) {
							if (strtolower($folder) === strtolower($group_name)) {
								$matched = $folder;
								break;
							}
						}
						if ($matched !== null) {
							// Return object with id (group id if available) and folder_path so frontend can map reliably
							$folders[] = array(
								'id' => isset($group['id']) ? $group['id'] : $group_name,
								'folder_path' => $matched . '/',
							);
							if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
								error_log('GOD_DEBUG: mapped group name ' . $group_name . ' to actual folder ' . $matched);
							}
						} else {
							// fallback to returning an object (id + folder_path)
							$folders[] = array(
								'id' => isset($group['id']) ? $group['id'] : $group_name,
								'folder_path' => $group_name . '/',
							);
							if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
								error_log('GOD_DEBUG: no match for group name ' . $group_name . ', using as-is');
							}
						}
					}
				}
				break;
			case 'ranges':
				   if ( $product_data && isset( $product_data['productRanges'] ) ) {
					   foreach ( $product_data['productRanges'] as $range ) {
						   // Always use the actual group name from productGroups for this range
						   $group_name = null;
						   if (isset($range['groupName']) && !empty($range['groupName'])) {
							   $group_name = $range['groupName'];
						   } elseif (isset($rangeIdToGroup[$range['id']]) && !empty($rangeIdToGroup[$range['id']])) {
							   $group_name = $rangeIdToGroup[$range['id']];
						   }
						   // Fallback 1: try to find group by matching range name to group/range relationships
						   if (!$group_name && $product_data && isset($product_data['productGroups'])) {
							   foreach ($product_data['productGroups'] as $group) {
								   if (isset($group['ranges']) && is_array($group['ranges'])) {
									   foreach ($group['ranges'] as $g_range) {
										   if (is_array($g_range) && isset($g_range['id']) && $g_range['id'] === $range['id']) {
											   $group_name = $group['name'];
											   break 2;
										   } elseif ($g_range === $range['name']) {
											   $group_name = $group['name'];
											   break 2;
										   }
									   }
								   }
							   }
						   }

						   // Fallback 2: if still not found, use relationships mapping if available
						   if (!$group_name && $product_data && isset($product_data['relationships']) && isset($product_data['relationships']['groupToRanges'])) {
							   foreach ($product_data['relationships']['groupToRanges'] as $groupId => $rangeIds) {
								   if (is_array($rangeIds) && in_array($range['id'], $rangeIds, true)) {
									   // find group by id
									   if (isset($product_data['productGroups']) && is_array($product_data['productGroups'])) {
										   foreach ($product_data['productGroups'] as $group) {
											   if (isset($group['id']) && $group['id'] === $groupId) {
												   $group_name = $group['name'];
												   break 2;
											   }
										   }
									   }
								   }
							   }
						   }
						   if (!$group_name) {
							   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
								   error_log('GOD_DEBUG: Could not determine group for range ' . print_r($range, true));
							   }
							   continue; // skip this range if we can't determine group
						   }
						   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
							   error_log('GOD_DEBUG: range name=' . print_r($range['name'], true) . ' group_name=' . print_r($group_name, true));
						   }
						   $folder_path = rtrim($group_name, '/') . '/' . rtrim($range['name'], '/') . '/';
						   $folders[] = array(
							   'id' => $range['id'],
							   'folder_path' => $folder_path
						   );
					   }
				   }
				break;
			case 'products':
				if ( $product_data && isset( $product_data['products'] ) ) {
					// Preload the list of actual folders from Spaces to improve matching
					$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();
					$all_folders = $do_spaces->list_all_folder_names();
					if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
						error_log('GOD_DEBUG: list_all_folder_names for products returned: ' . print_r($all_folders, true));
					}
					// Local sanitizer helpers to match DigitalOceanSpaces::sanitize_folder_path
					$sanitize_segment_local = function( $segment ) {
						$cleaned = preg_replace( '/[^a-zA-Z0-9\s\-_]/', ' ', $segment );
						$cleaned = preg_replace( '/\s+/', ' ', $cleaned );
						$trimmed = trim( $cleaned );
						$preserve_case = get_option( 'urbana_do_preserve_folder_case', false );
						return $preserve_case ? $trimmed : strtolower( $trimmed );
					};
					$sanitize_folder_path_local = function( $path ) use ( $sanitize_segment_local ) {
						$parts = array_filter( explode( '/', $path ) );
						$sanitized_parts = array_map( $sanitize_segment_local, $parts );
						return implode( '/', $sanitized_parts );
					};

					foreach ( $product_data['products'] as $product ) {
						// Try to get group and range from product, else lookup from relationships
						$group_name = isset($product['groupName']) ? $product['groupName'] : (isset($productIdToGroup[$product['id']]) ? $productIdToGroup[$product['id']] : 'default');
						$range_name = isset($product['rangeName']) ? $product['rangeName'] : (isset($productIdToRange[$product['id']]) ? $productIdToRange[$product['id']] : 'default');
						$product_code = isset( $product['code'] ) ? $product['code'] : $product['name'];
						if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
							error_log('GOD_DEBUG: product=' . print_r($product, true) . ' group_name=' . print_r($group_name, true) . ' range_name=' . print_r($range_name, true));
						}
						if ($group_name === 'default' || $range_name === 'default') {
							if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
								error_log('GOD_DEBUG: Product missing groupName or rangeName: ' . print_r($product, true));
							}
						}

						// Build the expected folder path from database values
						$expected_folder_path = rtrim($group_name, '/') . '/' . rtrim($range_name, '/') . '/' . rtrim($product_code, '/') . '/';

						// Attempt to find the actual folder in Spaces using sanitized comparisons
						$sanitized_expected = $sanitize_folder_path_local( $expected_folder_path );
						$found_match = null;
						foreach ( $all_folders as $existing_folder ) {
							$existing_sanitized = $sanitize_folder_path_local( $existing_folder );
							// If exact sanitized match, prefer it
							if ( strtolower( trim( $existing_sanitized, '/' ) ) === strtolower( trim( $sanitized_expected, '/' ) ) ) {
								$found_match = $existing_folder;
								break;
							}
							// If existing ends-with the sanitized expected path (handles prefixes)
							if ( str_ends_with( strtolower( rtrim( $existing_sanitized, '/' ) ), strtolower( trim( $sanitized_expected, '/' ) ) ) ) {
								$found_match = $existing_folder;
								break;
							}
							// If existing contains the product code as the basename, treat as match
							if ( basename( strtolower( rtrim( $existing_sanitized, '/' ) ) ) === strtolower( trim( $sanitize_segment_local( $product_code ), '/' ) ) ) {
								$found_match = $existing_folder;
								break;
							}
						}

						// Use matched path if available, otherwise fall back to expected path
						$final_folder_path = $found_match ? rtrim( $found_match, '/' ) . '/' : $expected_folder_path;

						if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
							error_log('GOD_DEBUG: Product folder mapping: product=' . print_r($product_code, true) . ' expected=' . $expected_folder_path . ' matched=' . $final_folder_path );
						}

						$folders[] = array(
							'id' => isset($product['id']) ? $product['id'] : $product_code,
							'folder_path' => $final_folder_path,
						);
					}
				}
				break;
		}
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log('GOD_DEBUG: get_folders_by_type returning: ' . print_r($folders, true));
		}
		return $folders;
	}

}

