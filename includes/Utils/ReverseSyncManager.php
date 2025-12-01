<?php

namespace Urbana\Utils;

class ReverseSyncManager {

	private $do_spaces;

	public function __construct() {
		$this->do_spaces = new DigitalOceanSpaces();
		
		// Hook into product data updates
		add_action( 'urbana_product_data_updated', array( $this, 'on_product_data_updated' ), 10, 2 );
		add_action( 'urbana_product_group_added', array( $this, 'on_product_group_added' ), 10, 1 );
		add_action( 'urbana_product_range_added', array( $this, 'on_product_range_added' ), 10, 2 );
		add_action( 'urbana_product_added', array( $this, 'on_product_added' ), 10, 3 );
		
		// Hook into scheduled events
		add_action( 'urbana_process_folder_creation', array( $this, 'process_bulk_folder_creation' ), 10, 2 );
	}

	/**
	 * Check if reverse sync is enabled and configured
	 */
	public function is_reverse_sync_enabled() {
		return get_option( 'urbana_do_reverse_sync_enabled', false ) && 
			   $this->do_spaces->is_configured();
	}

	/**
	 * Handle product data updates - analyze changes and trigger appropriate folder creation
	 */
	public function on_product_data_updated( $key, $data ) {
		if ( ! $this->is_reverse_sync_enabled() ) {
			return;
		}

		// Only handle stepper_form_data updates
		if ( $key !== 'stepper_form_data' ) {
			return;
		}

		// Get the base path from settings
		$base_path = get_option( 'urbana_do_reverse_sync_base_path', '' );

		// Schedule folder creation in the background to avoid blocking the UI
		wp_schedule_single_event( time(), 'urbana_process_folder_creation', array( $data, $base_path ) );
	}

	/**
	 * Handle individual group addition
	 */
	public function on_product_group_added( $group_name ) {
		if ( ! $this->is_reverse_sync_enabled() || 
			 ! get_option( 'urbana_do_auto_create_group_folders', true ) ) {
			return;
		}

		$base_path = get_option( 'urbana_do_reverse_sync_base_path', '' );
		
		// Create group folder immediately for single additions
		$result = $this->do_spaces->create_group_folders( $group_name, $base_path );
		
		// Log result
		$this->log_folder_creation_result( 'group', $group_name, $result );
	}

	/**
	 * Handle individual range addition
	 */
	public function on_product_range_added( $group_name, $range_name ) {
		if ( ! $this->is_reverse_sync_enabled() || 
			 ! get_option( 'urbana_do_auto_create_range_folders', true ) ) {
			return;
		}

		$base_path = get_option( 'urbana_do_reverse_sync_base_path', '' );
		
		// Create range folder immediately for single additions
		$result = $this->do_spaces->create_range_folders( $group_name, $range_name, $base_path );
		
		// Log result
		$this->log_folder_creation_result( 'range', "$group_name/$range_name", $result );
	}

	/**
	 * Handle individual product addition
	 */
	public function on_product_added( $group_name, $range_name, $product_code ) {
		if ( ! $this->is_reverse_sync_enabled() || 
			 ! get_option( 'urbana_do_auto_create_product_folders', true ) ) {
			return;
		}

		$base_path = get_option( 'urbana_do_reverse_sync_base_path', '' );
		
		// Create product folders immediately for single additions
		$result = $this->do_spaces->create_product_folders( $group_name, $range_name, $product_code, $base_path );
		
		// Log result
		$this->log_folder_creation_result( 'product', "$group_name/$range_name/$product_code", $result );
	}

	/**
	 * Process bulk folder creation from stepper form data
	 */
	public function process_bulk_folder_creation( $data, $base_path ) {
		if ( ! $this->is_reverse_sync_enabled() ) {
			return;
		}

		$created_folders = array();
		$failed_folders = array();

		// Extract groups, ranges, and products from the stepper form data
		$structure = $this->extract_structure_from_data( $data );

		foreach ( $structure as $item ) {
			$result = null;
			$identifier = '';

			switch ( $item['type'] ) {
				case 'group':
					if ( get_option( 'urbana_do_auto_create_group_folders', true ) ) {
						$result = $this->do_spaces->create_group_folders( $item['group'], $base_path );
						$identifier = $item['group'];
					}
					break;

				case 'range':
					if ( get_option( 'urbana_do_auto_create_range_folders', true ) ) {
						$result = $this->do_spaces->create_range_folders( $item['group'], $item['range'], $base_path );
						$identifier = $item['group'] . '/' . $item['range'];
					}
					break;

				case 'product':
					if ( get_option( 'urbana_do_auto_create_product_folders', true ) ) {
						$result = $this->do_spaces->create_product_folders( $item['group'], $item['range'], $item['product'], $base_path );
						$identifier = $item['group'] . '/' . $item['range'] . '/' . $item['product'];
					}
					break;
			}

			if ( $result ) {
				if ( $result['success'] ) {
					$created_folders[] = array(
						'type' => $item['type'],
						'identifier' => $identifier,
						'result' => $result
					);
				} else {
					$failed_folders[] = array(
						'type' => $item['type'],
						'identifier' => $identifier,
						'error' => $result['message']
					);
				}
			}
		}

		// Log bulk operation results
		$this->log_bulk_operation_result( $created_folders, $failed_folders );
	}

	/**
	 * Extract structure information from stepper form data
	 */
	private function extract_structure_from_data( $data ) {
		$structure = array();

		if ( ! isset( $data['stepperForm'] ) ) {
			return $structure;
		}

		// Extract from step data (simplified - you may need to adjust based on your data structure)
		$stepper_data = $data['stepperForm'];

		// Extract groups from step 1
		if ( isset( $stepper_data['steps'][0]['categories'] ) ) {
			foreach ( $stepper_data['steps'][0]['categories'] as $group ) {
				$structure[] = array(
					'type' => 'group',
					'group' => $group
				);
			}
		}

		// Extract ranges from step 2
		if ( isset( $stepper_data['steps'][1]['ranges'] ) ) {
			foreach ( $stepper_data['steps'][1]['ranges'] as $group => $ranges ) {
				foreach ( $ranges as $range ) {
					$structure[] = array(
						'type' => 'range',
						'group' => $group,
						'range' => $range
					);
				}
			}
		}

		// Extract products from step 3 or other data sources
		if ( isset( $stepper_data['products'] ) ) {
			foreach ( $stepper_data['products'] as $product ) {
				if ( isset( $product['group'], $product['range'], $product['code'] ) ) {
					$structure[] = array(
						'type' => 'product',
						'group' => $product['group'],
						'range' => $product['range'],
						'product' => $product['code']
					);
				}
			}
		}

		return $structure;
	}

	/**
	 * Log folder creation results
	 */
	private function log_folder_creation_result( $type, $identifier, $result ) {
		$log_message = sprintf(
			'[Urbana Reverse Sync] %s folder creation for "%s": %s',
			ucfirst( $type ),
			$identifier,
			$result['success'] ? 'SUCCESS' : 'FAILED - ' . $result['message']
		);

		error_log( $log_message );

		// Optionally store in database for admin viewing
		$this->store_sync_log( $type, $identifier, $result );
	}

	/**
	 * Log bulk operation results
	 */
	private function log_bulk_operation_result( $created_folders, $failed_folders ) {
		$log_message = sprintf(
			'[Urbana Reverse Sync] Bulk operation completed: %d folders created, %d failed',
			count( $created_folders ),
			count( $failed_folders )
		);

		error_log( $log_message );

		if ( ! empty( $failed_folders ) ) {
			foreach ( $failed_folders as $failure ) {
				error_log( "[Urbana Reverse Sync] Failed: {$failure['type']} {$failure['identifier']} - {$failure['error']}" );
			}
		}
	}

	/**
	 * Store sync log in database for admin viewing
	 */
	private function store_sync_log( $type, $identifier, $result ) {
		// Store in WordPress options or custom table
		$logs = get_option( 'urbana_reverse_sync_logs', array() );
		
		$logs[] = array(
			'timestamp' => time(),
			'type' => $type,
			'identifier' => $identifier,
			'success' => $result['success'],
			'message' => $result['message'],
			'details' => $result
		);

		// Keep only the last 100 logs
		$logs = array_slice( $logs, -100 );

		update_option( 'urbana_reverse_sync_logs', $logs );
	}

	/**
	 * Get stored sync logs for admin viewing
	 */
	public static function get_sync_logs( $limit = 50 ) {
		$logs = get_option( 'urbana_reverse_sync_logs', array() );
		return array_slice( array_reverse( $logs ), 0, $limit );
	}

	/**
	 * Clear sync logs
	 */
	public static function clear_sync_logs() {
		delete_option( 'urbana_reverse_sync_logs' );
	}

	/**
	 * Manually trigger folder creation for specific items
	 */
	public function manual_create_folders( $type, $data ) {
		if ( ! $this->is_reverse_sync_enabled() ) {
			return array( 'success' => false, 'message' => 'Reverse sync not enabled or configured' );
		}

		$base_path = get_option( 'urbana_do_reverse_sync_base_path', '' );

		switch ( $type ) {
			case 'group':
				return $this->do_spaces->create_group_folders( $data['group_name'], $base_path );

			case 'range':
				return $this->do_spaces->create_range_folders( $data['group_name'], $data['range_name'], $base_path );

			case 'product':
				return $this->do_spaces->create_product_folders( $data['group_name'], $data['range_name'], $data['product_code'], $base_path );

			default:
				return array( 'success' => false, 'message' => 'Invalid folder type' );
		}
	}
}