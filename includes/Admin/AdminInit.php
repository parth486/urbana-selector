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

		// Migration UI for updating stored group names (hidden unless debug mode is enabled)
		if ( (bool) get_option( 'urbana_debug_mode', false ) ) {
			echo '<div id="urbana-migration-ui" style="margin-bottom:18px;padding:12px;border:1px solid #ddd;background:#fff;border-radius:6px;">';
			echo '<h2 style="margin-top:0;">Data Builder — Group name migration</h2>';
			echo '<p style="margin:6px 0 12px;color:#444;">Quick migration tool: update saved product builder data group names in the database (admin only).</p>';
			echo '<label style="display:block;margin-bottom:6px;font-weight:600;">From (existing group name)<br/>';
			echo '<input id="urbana-migrate-from" type="text" value="Shelter" style="width:240px;margin-top:6px;padding:6px;border-radius:4px;border:1px solid #ccc;"/>'; 
			echo '</label>';
			echo '<label style="display:block;margin:12px 0 6px;font-weight:600;">To (target group name)<br/>';
			echo '<input id="urbana-migrate-to" type="text" value="Shelters" style="width:240px;margin-top:6px;padding:6px;border-radius:4px;border:1px solid #ccc;"/>'; 
			echo '</label>';
			echo '<div style="margin-top:12px;display:flex;gap:10px;align-items:center;">';
			echo '<button id="urbana-run-migration" class="button button-primary">Run migration (rename)</button>&nbsp;';
			echo '<button id="urbana-populate-range-groups" class="button">Populate missing range.groupName</button>';
			echo '&nbsp;<button id="urbana-run-scan" class="button">Run DO mismatch scan (dry-run)</button>';
			echo '<span id="urbana-migration-status" style="margin-left:10px;vertical-align:middle;color:#666"></span>';
			echo '</div>';
			echo '<div id="urbana-migration-report" style="margin-top:12px;white-space:pre-wrap;font-family:monospace;color:#222;display:none;border-top:1px solid #eee;padding-top:10px;"></div>';
			echo '</div>';
			echo <<<'EOD'
<script type="text/javascript">
// Migration UI script loaded
(function(){
	// Migration UI script initialized (debug messages removed for production)
	const btn = document.getElementById("urbana-run-migration");
	const populateBtn = document.getElementById("urbana-populate-range-groups");
	const status = document.getElementById("urbana-migration-status");
	const report = document.getElementById("urbana-migration-report");

	// Rename migration
	btn.addEventListener("click", async function(){
		const from = document.getElementById("urbana-migrate-from").value.trim();
		const to = document.getElementById("urbana-migrate-to").value.trim();
		if(!from || !to){
			status.textContent = "Please provide both names.";
			return;
		}
		if(!confirm("This operation will update stored builder data and save a backup per builder key. Proceed?")) return;
		btn.disabled = true; status.textContent = 'Running migration...'; report.style.display = 'none'; report.textContent = '';
		try{
			const url = (typeof urbanaAdmin !== 'undefined' && urbanaAdmin.apiUrl) ? urbanaAdmin.apiUrl + 'product-data/migrate-group-name' : '/wp-json/urbana/v1/product-data/migrate-group-name';
			const resp = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': (typeof urbanaAdmin !== 'undefined' ? urbanaAdmin.nonce : '')
				},
				body: JSON.stringify({ from: from, to: to })
			});
			const json = await resp.json();
			if(!resp.ok){
				status.textContent = 'Migration failed: ' + (json.message || resp.statusText);
				report.style.display = 'block'; report.textContent = JSON.stringify(json, null, 2);
			}else{
				status.textContent = 'Migration completed — see report below.';
				report.style.display = 'block'; report.textContent = JSON.stringify(json, null, 2);
				// Refresh page so the Data Builder app reloads updated builder data
				setTimeout(function(){ window.location.reload(); }, 1000);
			}
		}catch(err){
			status.textContent = 'Error: ' + err.message;
			report.style.display = 'block'; report.textContent = '' + err;
		}finally{ btn.disabled = false; }
	});

	// Populate missing range.groupName
	populateBtn.addEventListener('click', async function(){
		if(!confirm('Populate any missing productRanges[].groupName values across builder data? A backup will be created for each builder key. Proceed?')) return;
		populateBtn.disabled = true; status.textContent = 'Populating range group names...'; report.style.display = 'none'; report.textContent = '';
		try{
			const url = (typeof urbanaAdmin !== 'undefined' && urbanaAdmin.apiUrl) ? urbanaAdmin.apiUrl + 'product-data/populate-range-group-names' : '/wp-json/urbana/v1/product-data/populate-range-group-names';
			const resp = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': (typeof urbanaAdmin !== 'undefined' ? urbanaAdmin.nonce : '')
				}
			});

			// scan handler will be attached separately below so the button works without clicking anything else

			// (scan handler attached outside populate flow)
			const json = await resp.json();
			if(!resp.ok){
				status.textContent = 'Populate failed: ' + (json.message || resp.statusText);
				report.style.display = 'block'; report.textContent = JSON.stringify(json, null, 2);
			} else {
				status.textContent = 'Populate completed — see report below.';
				report.style.display = 'block'; report.textContent = JSON.stringify(json, null, 2);
				// Refresh page to ensure client picks up changes
				setTimeout(function(){ window.location.reload(); }, 1000);
			}
		}catch(err){
			status.textContent = 'Error: ' + err.message;
			report.style.display = 'block'; report.textContent = '' + err;
		}finally{ populateBtn.disabled = false; }
	});
		// Attach the scan handler independently so the button works without clicking anything else
		const attachScanHandler = () => {
			try {
				const scanBtn = document.getElementById('urbana-run-scan');
				if (!scanBtn) {
					console.debug('[Urbana Admin] scan button not present yet');
					return;
				}
				// Avoid attaching multiple listeners
				if (scanBtn.dataset.urbanaScanAttached) return;
				scanBtn.dataset.urbanaScanAttached = '1';

				console.debug('[Urbana Admin] attaching scan button handler');
				scanBtn.addEventListener('click', async function(){
					scanBtn.disabled = true; status.textContent = 'Running DO mismatch scan...'; report.style.display = 'none'; report.textContent = '';
					try {
						const url = (typeof urbanaAdmin !== 'undefined' && urbanaAdmin.apiUrl) ? urbanaAdmin.apiUrl + 'digital-ocean/scan-mismatches' : '/wp-json/urbana/v1/digital-ocean/scan-mismatches';
						const resp = await fetch(url, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'X-WP-Nonce': (typeof urbanaAdmin !== 'undefined' ? urbanaAdmin.nonce : '')
							},
							body: JSON.stringify({ type: 'ranges', force_refresh: true })
						});
						const json = await resp.json();
						if (!resp.ok) {
							status.textContent = 'Scan failed: ' + (json.message || resp.statusText);
							report.style.display = 'block'; report.textContent = JSON.stringify(json, null, 2);
						} else {
							status.textContent = 'Scan completed — see report below.';
							report.style.display = 'block'; report.textContent = JSON.stringify(json, null, 2);
							// Dispatch an in-page event so the Data Builder React app can update badges without a full reload
							try{
								window.dispatchEvent(new CustomEvent('urbana:do-scan-completed', { detail: json }));
							} catch(e) { console.warn('[Urbana Admin] failed to dispatch scan-complete event', e); }
						}
					} catch (err) {
						console.error('[Urbana Admin] scan failed', err);
						status.textContent = 'Error: ' + (err?.message || err);
						report.style.display = 'block'; report.textContent = '' + err;
					} finally { scanBtn.disabled = false; }
				});
			} catch (e) {
				console.error('[Urbana Admin] attachScanHandler error', e);
			}
		};

		// Attach immediately and also when DOMContentLoaded in case the element wasn't present yet
		attachScanHandler();
		document.addEventListener('DOMContentLoaded', attachScanHandler);
})();
</script>
EOD;
		} // end debug-mode check
		// Mount node for the React Data Builder app
		echo '<div id="urbana-data-builder-root"></div>';
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
					array( 'wp-element' ),
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

				// Defensive polyfill: ensure createPortal exists on wp.element to avoid runtime errors
				$urbana_portal_polyfill = "(function(){try{if(window.wp && window.wp.element){if(typeof window.wp.element.createPortal !== 'function'){window.wp.element.createPortal = function(children, container){return children;}; console.warn('[Urbana] wp.element.createPortal polyfilled (no-op)');}}}catch(e){console.warn('[Urbana] createPortal check failed', e);}})();";
				wp_add_inline_script( 'urbana-settings', $urbana_portal_polyfill, 'before' );

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
						'debugMode'     => (bool) get_option( 'urbana_debug_mode', false ),
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
					array( 'wp-element' ),
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

				// Defensive polyfill: ensure createPortal exists on wp.element to avoid runtime errors
				$urbana_portal_polyfill = "(function(){try{if(window.wp && window.wp.element){if(typeof window.wp.element.createPortal !== 'function'){window.wp.element.createPortal = function(children, container){return children;}; console.warn('[Urbana] wp.element.createPortal polyfilled (no-op)');}}}catch(e){console.warn('[Urbana] createPortal check failed', e);}})();";
				wp_add_inline_script( 'urbana-data-builder', $urbana_portal_polyfill, 'before' );

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
						'debugMode'          => (bool) get_option( 'urbana_debug_mode', false ),
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

				// Defensive polyfill: ensure createPortal exists on wp.element to avoid runtime errors
				$urbana_portal_polyfill = "(function(){try{if(window.wp && window.wp.element){if(typeof window.wp.element.createPortal !== 'function'){window.wp.element.createPortal = function(children, container){return children;}; console.warn('[Urbana] wp.element.createPortal polyfilled (no-op)');}}}catch(e){console.warn('[Urbana] createPortal check failed', e);}})();";
				wp_add_inline_script( 'urbana-admin-orders', $urbana_portal_polyfill, 'before' );

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
						'apiUrl'    => rest_url( 'urbana/v1/' ),
						'nonce'     => wp_create_nonce( 'wp_rest' ),
						'ajaxUrl'   => admin_url( 'admin-ajax.php' ),
						'debugMode' => (bool) get_option( 'urbana_debug_mode', false ),
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

