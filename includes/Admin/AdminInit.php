<?php
namespace Urbana\Admin;

class AdminInit {

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ) );
		add_action( 'admin_init', array( $this, 'admin_init' ) );
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
}
