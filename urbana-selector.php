<?php
/**
 * Plugin Name: Urbana Selector
 * Description: A WordPress plugin for product configurator with React + Tailwind interface.
 * Version: 1.0.1.1
 * Author: Urbana
 * License: GPL v2 or later
 * Text Domain: urbana-selector
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Define plugin constants
define( 'URBANA_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'URBANA_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'URBANA_VERSION', '1.0.1' );

// Load Composer autoloader FIRST
// if ( file_exists( URBANA_PLUGIN_PATH . 'vendor/autoload.php' ) ) {
// require_once URBANA_PLUGIN_PATH . 'vendor/autoload.php';
// }

// Autoload classes
spl_autoload_register(
	function ( $class ) {
		if ( strpos( $class, 'Urbana\\' ) === 0 ) {
			$class = str_replace( 'Urbana\\', '', $class );
			$class = str_replace( '\\', '/', $class );
			$file  = URBANA_PLUGIN_PATH . 'includes/' . $class . '.php';
			if ( file_exists( $file ) ) {
				require_once $file;
			}
		}
	}
);

// Initialize the plugin
class UrbanaSelector {

	public function __construct() {
		add_action( 'init', array( $this, 'init' ) );
		register_activation_hook( __FILE__, array( $this, 'activate' ) );
		register_deactivation_hook( __FILE__, array( $this, 'deactivate' ) );
	}

	public function init() {
		// Load text domain
		load_plugin_textdomain( 'urbana-selector', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );

		// Initialize admin
		if ( is_admin() ) {

			new Urbana\Admin\AdminInit();
		}

		// Initialize frontend
		new Urbana\Frontend\FrontendInit();

		// Initialize REST API
		new Urbana\API\RestAPI();
		new Urbana\API\RenameEndpoints();

		// Initialize database
		new Urbana\Database\DatabaseManager();

		// Initialize reverse sync manager
		new Urbana\Utils\ReverseSyncManager();
	}

	public function activate() {
		// Create database tables
		$db_manager = new Urbana\Database\DatabaseManager();
		$db_manager->create_tables();

		// Initialize default settings on first activation
		$this->initialize_default_settings();

		// Flush rewrite rules
		flush_rewrite_rules();
	}

	public function deactivate() {
		// Clean up if needed
		flush_rewrite_rules();
	}

	/**
	 * Initialize default settings on plugin activation
	 */
	private function initialize_default_settings() {
		// Only set defaults if not already set
		if ( get_option( 'urbana_do_reverse_sync_base_path' ) === false ) {
			// Set base_path to empty string (root level) by default
			add_option( 'urbana_do_reverse_sync_base_path', '', '', 'no' );
			error_log( 'Urbana: Initialized base_path to empty string (root level)' );
		}
		
		// Set other reverse sync defaults if not already set
		if ( get_option( 'urbana_do_reverse_sync_enabled' ) === false ) {
			add_option( 'urbana_do_reverse_sync_enabled', false, '', 'no' );
		}
		
		if ( get_option( 'urbana_do_auto_create_group_folders' ) === false ) {
			add_option( 'urbana_do_auto_create_group_folders', true, '', 'no' );
		}
		
		if ( get_option( 'urbana_do_auto_create_range_folders' ) === false ) {
			add_option( 'urbana_do_auto_create_range_folders', true, '', 'no' );
		}
		
		if ( get_option( 'urbana_do_auto_create_product_folders' ) === false ) {
			add_option( 'urbana_do_auto_create_product_folders', true, '', 'no' );
		}

		// Option: preserve the original case of folder path segments when creating folders in DigitalOcean
		if ( get_option( 'urbana_do_preserve_folder_case' ) === false ) {
			add_option( 'urbana_do_preserve_folder_case', false, '', 'no' );
		}
		
		// Fix any incorrect base_path values from old versions
		$this->fix_base_path_setting();
	}

	/**
	 * Fix base_path setting if it contains unwanted default value
	 */
	private function fix_base_path_setting() {
		$current_base_path = get_option( 'urbana_do_reverse_sync_base_path', null );
		
		// If base_path is set to "assets/products" or "assets", clear it
		if ( $current_base_path === 'assets/products' || $current_base_path === 'assets' ) {
			update_option( 'urbana_do_reverse_sync_base_path', '' );
			error_log( 'Urbana: Auto-fixed base_path setting from "' . $current_base_path . '" to empty string' );
		}
	}
}

// Initialize the plugin
new UrbanaSelector();

// Load base path fix admin page
if ( is_admin() && file_exists( URBANA_PLUGIN_PATH . 'fix-base-path-admin.php' ) ) {
	require_once URBANA_PLUGIN_PATH . 'fix-base-path-admin.php';
}
