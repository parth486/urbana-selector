<?php
/**
 * API endpoints for renaming Digital Ocean folders
 *
 * @package Urbana
 */

namespace Urbana\API;

class RenameEndpoints {

	/**
	 * Register rename endpoints
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register REST API routes
	 */
	public function register_routes() {
		register_rest_route(
			'urbana/v1',
			'/digital-ocean/rename-folder',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'rename_folder' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}

	/**
	 * Rename a folder in Digital Ocean Spaces
	 */
	public function rename_folder( $request ) {
		$old_path = $request->get_param( 'old_path' );
		$new_path = $request->get_param( 'new_path' );
		$type     = $request->get_param( 'type' ); // 'group', 'range', or 'product'

		if ( empty( $old_path ) || empty( $new_path ) ) {
			return new \WP_Error(
				'invalid_paths',
				'Both old_path and new_path are required',
				array( 'status' => 400 )
			);
		}

		// Check if reverse sync is enabled
		if ( ! get_option( 'urbana_do_reverse_sync_enabled', false ) ) {
			return new \WP_Error(
				'reverse_sync_disabled',
				'Digital Ocean reverse sync is disabled in settings',
				array( 'status' => 400 )
			);
		}

		$do_spaces = new \Urbana\Utils\DigitalOceanSpaces();

		if ( ! $do_spaces->is_configured() ) {
			return new \WP_Error(
				'not_configured',
				'Digital Ocean Spaces not configured',
				array( 'status' => 400 )
			);
		}

		// Rename the folder
		$result = $do_spaces->rename_folder( $old_path, $new_path );

		if ( ! $result['success'] ) {
			return new \WP_Error(
				'rename_failed',
				$result['message'],
				array( 'status' => 500 )
			);
		}

		return rest_ensure_response(
			array(
				'success'      => true,
				'message'      => 'Folder renamed successfully',
				'old_path'     => $old_path,
				'new_path'     => $new_path,
				'files_moved'  => $result['files_moved'],
				'folders_moved' => $result['folders_moved'],
			)
		);
	}
}
