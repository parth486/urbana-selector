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

		// Send email notification
		$this->send_email_notification( $submission_data );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'id'      => $this->db_manager->wpdb->insert_id,
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

		$result = $this->db_manager->update_product_data( 'stepper_form_data', $data );

		if ( $result === false ) {
			return new \WP_Error( 'update_failed', 'Failed to update product data', array( 'status' => 500 ) );
		}

		return new \WP_REST_Response( array( 'success' => true ) );
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
}
