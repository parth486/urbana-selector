<?php
namespace Urbana\Admin;

class AdminInit {

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ) );
		add_action( 'admin_init', array( $this, 'admin_init' ) );
		
		// Register AJAX actions for bi-directional sync
		add_action( 'wp_ajax_urbana_list_all_folders', array( $this, 'ajax_list_all_folders' ) );
		add_action( 'wp_ajax_urbana_sync_folders_to_do', array( $this, 'ajax_sync_folders_to_do' ) );
	}

	public function add_admin_menu() {
		// Main menu page
		add_menu_page(
			'Urbana Selector',
			'Urbana Selector',
			'manage_options',
			'urbana-selector',
			array( $this, 'admin_page' ),
			'dashicons-hammer',
			30
		);

		// Data Builder submenu
		add_submenu_page(
			'urbana-selector',
			'Data Builder',
			'Data Builder',
			'manage_options',
			'urbana-data-builder',
			array( $this, 'data_builder_page' )
		);

		// Orders submenu
		add_submenu_page(
			'urbana-selector',
			'Customer Orders',
			'Customer Orders',
			'manage_options',
			'urbana-orders',
			array( $this, 'orders_page' )
		);
	}

	public function admin_page() {
		wp_enqueue_script( 'urbana-settings' );
		wp_enqueue_style( 'urbana-settings' );

		echo '<div class="wrap">';
		echo '<div id="urbana-settings-root"></div>';
		echo '</div>';
	}

	public function data_builder_page() {
		wp_enqueue_script( 'urbana-data-builder' );
		wp_enqueue_style( 'urbana-data-builder' );

		echo '<div class="wrap">';
		echo '<div id="urbana-data-builder-root"></div>';
		echo '</div>';
	}

	public function orders_page() {
		wp_enqueue_script( 'urbana-admin-orders' );
		wp_enqueue_style( 'urbana-admin-orders' );

		echo '<div class="wrap">';
		echo '<div id="urbana-admin-orders-root"></div>';
		echo '</div>';
	}

	public function enqueue_admin_scripts( $hook ) {
		// Only load scripts on our admin pages.
		if ( strpos( $hook, 'urbana-' ) === false ) {
			return;
		}
		global $wpdb;
		$asset_file = URBANA_PLUGIN_PATH . 'assets/dist/';

		// Settings App (Main page).
		if ( 'toplevel_page_urbana-selector' === $hook ) {
			if ( file_exists( $asset_file . 'settings-app.js' ) ) {

				wp_enqueue_script(
					'urbana-settings',
					URBANA_PLUGIN_URL . 'assets/dist/settings-app.js',
					array(),
					URBANA_VERSION,
					true
				);

				// Add module type attribute.
				add_filter(
					'script_loader_tag',
					function ( $tag, $handle ) {
						if ( 'urbana-settings' === $handle ) {
							return str_replace( '<script', '<script type="module"', $tag );
						}
						return $tag;
					},
					10,
					2
				);

				wp_enqueue_style(
					'urbana-settings',
					URBANA_PLUGIN_URL . 'assets/dist/settings-app.css',
					array(),
					URBANA_VERSION
				);

				// Localize script for API calls.
				wp_localize_script(
					'urbana-settings',
					'urbanaAdmin',
					array(
						'apiUrl'        => rest_url( 'urbana/v1/' ),
						'nonce'         => wp_create_nonce( 'wp_rest' ),
						'ajaxUrl'       => admin_url( 'admin-ajax.php' ),
						'wpVersion'     => get_bloginfo( 'version' ),
						'phpVersion'    => phpversion(),
						'pluginVersion' => URBANA_VERSION,
					)
				);
			}
		}

		// Data Builder App.
		if ( 'urbana-selector_page_urbana-data-builder' === $hook ) {
			if ( file_exists( $asset_file . 'data-builder-app.js' ) ) {

				wp_enqueue_media();
				wp_enqueue_script(
					'urbana-data-builder',
					URBANA_PLUGIN_URL . 'assets/dist/data-builder-app.js',
					array(),
					URBANA_VERSION,
					true
				);

					// Add module type attribute.
				add_filter(
					'script_loader_tag',
					function ( $tag, $handle ) {
						if ( 'urbana-data-builder' === $handle ) {
							return str_replace( '<script', '<script type="module"', $tag );
						}
						return $tag;
					},
					10,
					2
				);

				wp_enqueue_style(
					'urbana-data-builder',
					URBANA_PLUGIN_URL . 'assets/dist/data-builder-app.css',
					array(),
					URBANA_VERSION
				);

				// Get data from database.
				$db_manager   = new \Urbana\Database\DatabaseManager();
				$stepper_id   = $db_manager->get_product_data_first_id();
				$stepper_data = $db_manager->get_product_data( $stepper_id, 'stepper_form_data' );
				$builder_key  = 'stepper_data_builder_' . $stepper_id;
				$builder_data = $db_manager->get_product_data( null, $builder_key );

				// Localize script for API calls.
				wp_localize_script(
					'urbana-data-builder',
					'urbanaAdmin',
					array(
						'apiUrl'             => rest_url( 'urbana/v1/' ),
						'nonce'              => wp_create_nonce( 'wp_rest' ),
						'ajaxUrl'            => admin_url( 'admin-ajax.php' ),
						'stepperId'          => $stepper_id,
						'stepperFormData'    => $stepper_data ? $stepper_data : array(),
						'stepperDataBuilder' => $builder_data ? $builder_data : array(),
					)
				);
			}
		}

		// Admin Orders App.
		if ( 'urbana-selector_page_urbana-orders' === $hook ) {
			if ( file_exists( $asset_file . 'admin-orders-app.js' ) ) {
				wp_enqueue_script(
					'urbana-admin-orders',
					URBANA_PLUGIN_URL . 'assets/dist/admin-orders-app.js',
					array( 'wp-element' ),
					URBANA_VERSION,
					true
				);

				// Add module type attribute.
				add_filter(
					'script_loader_tag',
					function ( $tag, $handle ) {
						if ( 'urbana-admin-orders' === $handle ) {
							return str_replace( '<script', '<script type="module"', $tag );
						}
						return $tag;
					},
					10,
					2
				);

				wp_enqueue_style(
					'urbana-admin-orders',
					URBANA_PLUGIN_URL . 'assets/dist/admin-orders-app.css',
					array(),
					URBANA_VERSION
				);

				// Localize script for API calls.
				wp_localize_script(
					'urbana-admin-orders',
					'urbanaAdmin',
					array(
						'apiUrl'  => rest_url( 'urbana/v1/' ),
						'nonce'   => wp_create_nonce( 'wp_rest' ),
						'ajaxUrl' => admin_url( 'admin-ajax.php' ),
					)
				);
			}
		}
	}

	public function admin_init() {
		// Register settings if needed
	}

	/**
	 * AJAX handler for listing all folders from Digital Ocean
	 */
	public function ajax_list_all_folders() {
		check_ajax_referer( 'wp_rest', '_wpnonce' );
		
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();
		if ( ! $do_spaces->is_configured() ) {
			wp_send_json_error( array( 'message' => 'Digital Ocean Spaces not configured' ), 400 );
		}

		try {
			// Check if force_refresh parameter is sent
			$force_refresh = isset( $_GET['force_refresh'] ) && $_GET['force_refresh'] === 'true';
			$folders = $do_spaces->list_all_folder_names( $force_refresh );
			wp_send_json_success( array(
				'folders' => $folders,
				'count' => count( $folders ),
				'force_refresh' => $force_refresh,
			) );
		} catch ( \Exception $e ) {
			wp_send_json_error( array( 'message' => $e->getMessage() ), 500 );
		}
	}

	/**
	 * AJAX handler for syncing folders to Digital Ocean
	 */
	public function ajax_sync_folders_to_do() {
		check_ajax_referer( 'wp_rest', '_wpnonce' );
		
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
		}

		$folders = isset( $_POST['folders'] ) ? json_decode( stripslashes( $_POST['folders'] ), true ) : array();
		
		if ( empty( $folders ) || ! is_array( $folders ) ) {
			wp_send_json_error( array( 'message' => 'Invalid folders parameter' ), 400 );
		}

		$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();
		if ( ! $do_spaces->is_configured() ) {
			wp_send_json_error( array( 'message' => 'Digital Ocean Spaces not configured' ), 400 );
		}

		$results = array();
		$success_count = 0;
		$failed_count = 0;

		foreach ( $folders as $folder_path ) {
			$result = $do_spaces->create_folder( $folder_path );
			
			if ( $result['success'] ) {
				$success_count++;
				$results[] = array(
					'path' => $folder_path,
					'success' => true,
					'message' => 'Folder created successfully',
				);
			} else {
				$failed_count++;
				$results[] = array(
					'path' => $folder_path,
					'success' => false,
					'message' => $result['message'] ?? 'Unknown error',
				);
			}
		}

		wp_send_json_success( array(
			'results' => $results,
			'summary' => array(
				'total' => count( $folders ),
				'success' => $success_count,
				'failed' => $failed_count,
			),
		) );
	}
}

