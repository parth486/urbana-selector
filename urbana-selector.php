<?php
/**
 * Plugin Name: Urbana Selector
 * Description: A WordPress plugin for product configurator with React + Tailwind interface.
 * Version: 1.0.1
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

		// Initialize database
		new Urbana\Database\DatabaseManager();
	}

	public function activate() {
		// Create database tables
		$db_manager = new Urbana\Database\DatabaseManager();
		$db_manager->create_tables();

		// Flush rewrite rules
		flush_rewrite_rules();
	}

	public function deactivate() {
		// Clean up if needed
		flush_rewrite_rules();
	}
}

// Initialize the plugin
new UrbanaSelector();
