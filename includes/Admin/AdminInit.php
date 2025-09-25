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
		echo '<div class="wrap">';
		echo '<h1>Urbana Selector</h1>';
		echo '<p>Welcome to the Urbana Selector plugin dashboard.</p>';
		echo '<div class="card" style="max-width: 800px;">';
		echo '<h2>Quick Actions</h2>';
		echo '<p><a href="' . admin_url( 'admin.php?page=urbana-data-builder' ) . '" class="button button-primary">Manage Product Data</a></p>';
		echo '<p><a href="' . admin_url( 'admin.php?page=urbana-orders' ) . '" class="button button-secondary">View Customer Submissions</a></p>';
		echo '</div>';
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
		// Only load scripts on our admin pages
		if ( strpos( $hook, 'urbana-' ) === false ) {
			return;
		}

		$asset_file = URBANA_PLUGIN_PATH . 'assets/dist/js/';

		// Data Builder App
		if ( $hook === 'urbana-selector_page_urbana-data-builder' ) {
			if ( file_exists( $asset_file . 'data-builder-app.js' ) ) {
				wp_enqueue_script(
					'urbana-data-builder',
					URBANA_PLUGIN_URL . 'assets/dist/js/data-builder-app.js',
					array(),
					URBANA_VERSION,
					true
				);

					// Add module type attribute
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

				// Localize script for API calls
				wp_localize_script(
					'urbana-data-builder',
					'urbanaAdmin',
					array(
						'apiUrl'  => rest_url( 'urbana/v1/' ),
						'nonce'   => wp_create_nonce( 'wp_rest' ),
						'ajaxUrl' => admin_url( 'admin-ajax.php' ),
					)
				);
			}
		}

		// Admin Orders App
		if ( $hook === 'urbana-selector_page_urbana-orders' ) {
			if ( file_exists( $asset_file . 'admin-orders-app.js' ) ) {
				wp_enqueue_script(
					'urbana-admin-orders',
					URBANA_PLUGIN_URL . 'assets/dist/admin-orders-app.js',
					array( 'wp-element' ),
					URBANA_VERSION,
					true
				);

				// Add module type attribute
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

				// Localize script for API calls
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
