<?php

namespace Urbana\Utils;

class DigitalOceanSpaces {

	private $bucket_name;
	private $region;
	private $endpoint;
	private $access_key;
	private $secret_key;

	public function __construct() {
		$this->bucket_name = get_option( 'urbana_do_bucket_name', '' );
		$this->region      = get_option( 'urbana_do_region', 'nyc3' );
		$this->endpoint    = "https://{$this->region}.digitaloceanspaces.com";
		$this->access_key  = get_option( 'urbana_do_access_key', '' );
		$this->secret_key  = get_option( 'urbana_do_secret_key', '' );
	}

	public function is_configured() {
		return ! empty( $this->bucket_name ) &&
				! empty( $this->access_key ) &&
				! empty( $this->secret_key );
	}

	public function is_sdk_available() {
		// Always return true since we're not using SDK anymore
		return true;
	}

	public function test_connection() {
		if ( ! $this->is_configured() ) {
			return array(
				'success' => false,
				'message' => 'Digital Ocean Spaces not configured',
			);
		}

		try {
			// Use HEAD request to test bucket access
			$url     = $this->endpoint . '/' . $this->bucket_name;
			$headers = $this->get_auth_headers( 'HEAD', '/' . $this->bucket_name );

			$response = wp_remote_head(
				$url,
				array(
					'headers' => $headers,
					'timeout' => 30,
				)
			);

			if ( is_wp_error( $response ) ) {
				return array(
					'success' => false,
					'message' => 'Connection failed: ' . $response->get_error_message(),
				);
			}

			$status_code = wp_remote_retrieve_response_code( $response );

			if ( $status_code === 200 || $status_code === 404 ) {
				// 200 = bucket exists and accessible
				// 404 = bucket doesn't exist but credentials are valid
				return array(
					'success' => true,
					'message' => 'Connection successful',
				);
			} else {
				return array(
					'success' => false,
					'message' => 'Connection failed with status code: ' . $status_code,
				);
			}
		} catch ( Exception $e ) {
			return array(
				'success' => false,
				'message' => 'Connection failed: ' . $e->getMessage(),
			);
		}
	}

	public function list_objects( $prefix = '', $max_keys = 1000 ) {
		if ( ! $this->is_configured() ) {
			return array(
				'success' => false,
				'message' => 'Digital Ocean Spaces not configured',
				'objects' => array(),
			);
		}

		try {
			$objects            = array();
			$continuation_token = null;
			$total_retrieved    = 0;

			do {
				$query_params = array(
					'list-type' => '2',
					'max-keys'  => min( 1000, $max_keys - $total_retrieved ),
				);

				if ( ! empty( $prefix ) ) {
					$query_params['prefix'] = $prefix;
				}

				if ( $continuation_token ) {
					$query_params['continuation-token'] = $continuation_token;
				}

				// Sort query parameters for canonical request
				ksort( $query_params );
				$query_string = http_build_query( $query_params, '', '&', PHP_QUERY_RFC3986 );

				// Separate path and query string for proper auth headers
				$path = '/' . $this->bucket_name;
				$url  = $this->endpoint . $path . '?' . $query_string;

				$headers = $this->get_auth_headers( 'GET', $path, $query_string );

				$response = wp_remote_get(
					$url,
					array(
						'headers' => $headers,
						'timeout' => 60,
					)
				);

				if ( is_wp_error( $response ) ) {
					return array(
						'success' => false,
						'message' => 'Failed to list objects: ' . $response->get_error_message(),
						'objects' => array(),
					);
				}

				$status_code = wp_remote_retrieve_response_code( $response );
				$body        = wp_remote_retrieve_body( $response );

				if ( $status_code !== 200 ) {
					return array(
						'success' => false,
						'message' => 'Failed to list objects. Status: ' . $status_code,
						'objects' => array(),
						'body'    => $body, // For debugging
						'headers' => $headers, // For debugging
					);
				}

				// Parse XML response
				$xml = simplexml_load_string( $body );
				if ( $xml === false ) {
					return array(
						'success' => false,
						'message' => 'Failed to parse response XML',
						'objects' => array(),
					);
				}

				// Extract objects from XML
				if ( isset( $xml->Contents ) ) {
					foreach ( $xml->Contents as $content ) {
						$key           = (string) $content->Key;
						$size          = (int) $content->Size;
						$last_modified = (string) $content->LastModified;

						// Skip directories (objects ending with /)
						if ( substr( $key, -1 ) === '/' ) {
							continue;
						}

						$objects[] = array(
							'key'           => $key,
							'size'          => $size,
							'last_modified' => $this->format_date( $last_modified ),
							'url'           => $this->get_object_url( $key ),
						);

						++$total_retrieved;

						if ( $total_retrieved >= $max_keys ) {
							break 2; // Break out of both loops
						}
					}
				}

				// Check for more results
				$continuation_token = isset( $xml->NextContinuationToken ) ? (string) $xml->NextContinuationToken : null;

			} while ( $continuation_token && $total_retrieved < $max_keys );

			return array(
				'success' => true,
				'message' => sprintf( 'Found %d objects', count( $objects ) ),
				'objects' => $objects,
			);

		} catch ( Exception $e ) {
			return array(
				'success' => false,
				'message' => 'Failed to list objects: ' . $e->getMessage(),
				'objects' => array(),
			);
		}
	}

	/**
	 * Generate authentication headers for AWS Signature Version 4
	 */
	private function get_auth_headers( $method, $path, $query_string = '' ) {
		$timestamp = gmdate( 'Ymd\THis\Z' );
		$date      = gmdate( 'Ymd' );

		// Canonical request components
		$canonical_uri = $path;

		// Sort query string parameters for canonical request
		if ( ! empty( $query_string ) ) {
			parse_str( $query_string, $params );
			ksort( $params );
			$canonical_querystring = http_build_query( $params, '', '&', PHP_QUERY_RFC3986 );
		} else {
			$canonical_querystring = '';
		}

		$canonical_headers = "host:{$this->region}.digitaloceanspaces.com\n" .
						"x-amz-content-sha256:UNSIGNED-PAYLOAD\n" .
						"x-amz-date:{$timestamp}\n";
		$signed_headers    = 'host;x-amz-content-sha256;x-amz-date';

		$canonical_request = $method . "\n" .
						$canonical_uri . "\n" .
						$canonical_querystring . "\n" .
						$canonical_headers . "\n" .
						$signed_headers . "\n" .
						'UNSIGNED-PAYLOAD';

		// String to sign
		$algorithm        = 'AWS4-HMAC-SHA256';
		$credential_scope = $date . '/' . $this->region . '/s3/aws4_request';
		$string_to_sign   = $algorithm . "\n" .
						$timestamp . "\n" .
						$credential_scope . "\n" .
						hash( 'sha256', $canonical_request );

		// Calculate signature
		$signing_key = $this->get_signature_key( $this->secret_key, $date, $this->region, 's3' );
		$signature   = hash_hmac( 'sha256', $string_to_sign, $signing_key );

		// Authorization header
		$authorization = $algorithm . ' ' .
					'Credential=' . $this->access_key . '/' . $credential_scope . ', ' .
					'SignedHeaders=' . $signed_headers . ', ' .
					'Signature=' . $signature;

		return array(
			'Authorization'        => $authorization,
			'x-amz-content-sha256' => 'UNSIGNED-PAYLOAD',
			'x-amz-date'           => $timestamp,
			'Host'                 => $this->region . '.digitaloceanspaces.com',
		);
	}

	/**
	 * Debug method to help troubleshoot signature issues
	 */
	public function debug_signature( $method = 'GET', $path = '/your-bucket', $query_string = '' ) {
		$timestamp = gmdate( 'Ymd\THis\Z' );
		$date      = gmdate( 'Ymd' );

		// Sort query string parameters
		if ( ! empty( $query_string ) ) {
			parse_str( $query_string, $params );
			ksort( $params );
			$canonical_querystring = http_build_query( $params, '', '&', PHP_QUERY_RFC3986 );
		} else {
			$canonical_querystring = '';
		}

		$canonical_headers = "host:{$this->region}.digitaloceanspaces.com\n" .
						"x-amz-content-sha256:UNSIGNED-PAYLOAD\n" .
						"x-amz-date:{$timestamp}\n";
		$signed_headers    = 'host;x-amz-content-sha256;x-amz-date';

		$canonical_request = $method . "\n" .
						$path . "\n" .
						$canonical_querystring . "\n" .
						$canonical_headers . "\n" .
						$signed_headers . "\n" .
						'UNSIGNED-PAYLOAD';

		return array(
			'timestamp'              => $timestamp,
			'date'                   => $date,
			'canonical_uri'          => $path,
			'canonical_querystring'  => $canonical_querystring,
			'canonical_headers'      => $canonical_headers,
			'signed_headers'         => $signed_headers,
			'canonical_request'      => $canonical_request,
			'canonical_request_hash' => hash( 'sha256', $canonical_request ),
		);
	}

	public function get_object_url( $key ) {
		if ( ! $this->is_configured() ) {
			return '';
		}

		return $this->endpoint . '/' . $this->bucket_name . '/' . ltrim( $key, '/' );
	}

	public function organize_objects_by_structure( $objects ) {
		$structured = array();

		foreach ( $objects as $object ) {
			$key   = $object['key'];
			$parts = explode( '/', $key );

			// Expected structure: category/range/product_code/type/filename
			if ( count( $parts ) >= 5 ) {
				$category     = $parts[0];
				$range        = $parts[1];
				$product_code = $parts[2];
				$type         = $parts[3]; // 'images' or 'downloads'
				$filename     = $parts[4];

				if ( ! isset( $structured[ $category ] ) ) {
					$structured[ $category ] = array();
				}

				if ( ! isset( $structured[ $category ][ $range ] ) ) {
					$structured[ $category ][ $range ] = array();
				}

				if ( ! isset( $structured[ $category ][ $range ][ $product_code ] ) ) {
					$structured[ $category ][ $range ][ $product_code ] = array(
						'images'    => array(),
						'downloads' => array(),
					);
				}

				if ( in_array( $type, array( 'images', 'downloads' ), true ) ) {
					$structured[ $category ][ $range ][ $product_code ][ $type ][] = array(
						'filename' => $filename,
						'url'      => $object['url'],
						'size'     => $object['size'],
						'modified' => $object['last_modified'],
					);
				}
			}
		}

		return $structured;
	}

	/**
	 * List folders and objects with hierarchy support
	 */
	public function list_folders_and_objects( $prefix = '', $delimiter = '/', $max_keys = 1000 ) {
		if ( ! $this->is_configured() ) {
			return array(
				'success' => false,
				'message' => 'Digital Ocean Spaces not configured',
				'folders' => array(),
				'objects' => array(),
			);
		}

		try {
			$folders            = array();
			$objects            = array();
			$continuation_token = null;
			$total_retrieved    = 0;

			do {
				$query_params = array(
					'list-type' => '2',
					'max-keys'  => min( 1000, $max_keys - $total_retrieved ),
					'delimiter' => $delimiter,
				);

				if ( ! empty( $prefix ) ) {
					$query_params['prefix'] = $prefix;
				}

				if ( $continuation_token ) {
					$query_params['continuation-token'] = $continuation_token;
				}

				// Sort query parameters for canonical request
				ksort( $query_params );
				$query_string = http_build_query( $query_params, '', '&', PHP_QUERY_RFC3986 );

				// Separate path and query string for proper auth headers
				$path = '/' . $this->bucket_name;
				$url  = $this->endpoint . $path . '?' . $query_string;

				$headers = $this->get_auth_headers( 'GET', $path, $query_string );

				$response = wp_remote_get(
					$url,
					array(
						'headers' => $headers,
						'timeout' => 60,
					)
				);

				if ( is_wp_error( $response ) ) {
					return array(
						'success' => false,
						'message' => 'Failed to list folders: ' . $response->get_error_message(),
						'folders' => array(),
						'objects' => array(),
					);
				}

				$status_code = wp_remote_retrieve_response_code( $response );
				$body        = wp_remote_retrieve_body( $response );

				if ( $status_code !== 200 ) {
					return array(
						'success' => false,
						'message' => 'Failed to list folders. Status: ' . $status_code,
						'folders' => array(),
						'objects' => array(),
						'body'    => $body, // For debugging
						'headers' => $headers, // For debugging
					);
				}

				// Parse XML response
				$xml = simplexml_load_string( $body );
				if ( $xml === false ) {
					return array(
						'success' => false,
						'message' => 'Failed to parse response XML',
						'folders' => array(),
						'objects' => array(),
					);
				}

				// Extract common prefixes (folders)
				if ( isset( $xml->CommonPrefixes ) ) {
					foreach ( $xml->CommonPrefixes as $common_prefix ) {
						$folder_path = (string) $common_prefix->Prefix;
						$folders[]   = rtrim( $folder_path, '/' );
					}
				}

				// Extract objects (files)
				if ( isset( $xml->Contents ) ) {
					foreach ( $xml->Contents as $content ) {
						$key           = (string) $content->Key;
						$size          = (int) $content->Size;
						$last_modified = (string) $content->LastModified;

						// Skip directories (objects ending with /)
						if ( substr( $key, -1 ) === '/' ) {
							continue;
						}

						$objects[] = array(
							'key'           => $key,
							'size'          => $size,
							'last_modified' => $this->format_date( $last_modified ),
							'url'           => $this->get_object_url( $key ),
						);

						++$total_retrieved;

						if ( $total_retrieved >= $max_keys ) {
							break 2; // Break out of both loops
						}
					}
				}

				// Check for more results
				$continuation_token = isset( $xml->NextContinuationToken ) ? (string) $xml->NextContinuationToken : null;

			} while ( $continuation_token && $total_retrieved < $max_keys );

			return array(
				'success' => true,
				'message' => sprintf( 'Found %d folders and %d objects', count( $folders ), count( $objects ) ),
				'folders' => array_unique( $folders ),
				'objects' => $objects,
			);

		} catch ( \Exception $e ) {
			return array(
				'success' => false,
				'message' => 'Failed to list folders: ' . $e->getMessage(),
				'folders' => array(),
				'objects' => array(),
			);
		}
	}

	/**
	 * Get comprehensive folder structure by recursively exploring all levels
	 */
	public function get_complete_folder_structure( $prefix = '' ) {
		if ( ! $this->is_configured() ) {
			return array(
				'success'   => false,
				'message'   => 'Digital Ocean Spaces not configured',
				'structure' => array(),
			);
		}

		$all_folders        = array();
		$all_objects        = array();
		$folders_to_explore = array( $prefix );
		$processed_folders  = array();

		while ( ! empty( $folders_to_explore ) ) {
			$current_prefix = array_shift( $folders_to_explore );

			// Skip if already processed
			if ( in_array( $current_prefix, $processed_folders, true ) ) {
				continue;
			}

			$processed_folders[] = $current_prefix;

			// Get folders and objects at current level
			$result = $this->list_folders_and_objects( $current_prefix );

			if ( ! $result['success'] ) {
				continue; // Skip failed requests
			}

			// Add found folders to our list
			foreach ( $result['folders'] as $folder ) {
				if ( ! in_array( $folder, $all_folders, true ) ) {
					$all_folders[] = $folder;
					// Add to exploration queue if not already processed
					$folder_with_slash = $folder . '/';
					if ( ! in_array( $folder_with_slash, $processed_folders, true ) ) {
						$folders_to_explore[] = $folder_with_slash;
					}
				}
			}

			// Add found objects to our list
			foreach ( $result['objects'] as $object ) {
				$all_objects[] = $object;
			}
		}

		// Organize the complete structure
		$structured_data = $this->organize_complete_structure( $all_folders, $all_objects );

		return array(
			'success'         => true,
			'message'         => sprintf( 'Found %d folders and %d objects', count( $all_folders ), count( $all_objects ) ),
			'folders'         => $all_folders,
			'objects'         => $all_objects,
			'structured_data' => $structured_data,
		);
	}

	/**
	 * Organize folders and objects into expected structure including empty folders
	 */
	public function organize_complete_structure( $folders, $objects ) {
		$structured = array();

		// First, create structure from folders (including empty ones)
		foreach ( $folders as $folder ) {
			$parts = explode( '/', $folder );

			if ( count( $parts ) >= 1 ) {
				$category = $parts[0];

				if ( ! isset( $structured[ $category ] ) ) {
					$structured[ $category ] = array();
				}

				if ( count( $parts ) >= 2 ) {
					$range = $parts[1];

					if ( ! isset( $structured[ $category ][ $range ] ) ) {
						$structured[ $category ][ $range ] = array();
					}

					if ( count( $parts ) >= 3 ) {
						$product_code = $parts[2];

						if ( ! isset( $structured[ $category ][ $range ][ $product_code ] ) ) {
							$structured[ $category ][ $range ][ $product_code ] = array(
								'images'    => array(),
								'downloads' => array(),
							);
						}
					}
				}
			}
		}

		// Then, add files to the structure
		foreach ( $objects as $object ) {
			$key   = $object['key'];
			$parts = explode( '/', $key );

			// Expected structure: category/range/product_code/type/filename
			if ( count( $parts ) >= 5 ) {
				$category     = $parts[0];
				$range        = $parts[1];
				$product_code = $parts[2];
				$type         = $parts[3]; // 'images' or 'downloads'
				$filename     = $parts[4];

				// Ensure structure exists
				if ( ! isset( $structured[ $category ] ) ) {
					$structured[ $category ] = array();
				}

				if ( ! isset( $structured[ $category ][ $range ] ) ) {
					$structured[ $category ][ $range ] = array();
				}

				if ( ! isset( $structured[ $category ][ $range ][ $product_code ] ) ) {
					$structured[ $category ][ $range ][ $product_code ] = array(
						'images'    => array(),
						'downloads' => array(),
					);
				}

				if ( in_array( $type, array( 'images', 'downloads' ), true ) ) {
					$structured[ $category ][ $range ][ $product_code ][ $type ][] = array(
						'filename' => $filename,
						'url'      => $object['url'],
						'size'     => $object['size'],
						'modified' => $object['last_modified'],
					);
				}
			}
		}

		return $structured;
	}

	public function get_configuration() {
		return array(
			'bucket_name'   => $this->bucket_name,
			'region'        => $this->region,
			'endpoint'      => $this->endpoint,
			'configured'    => $this->is_configured(),
			'sdk_available' => true, // Always true now
			'access_key'    => $this->access_key,
			'secret_key'    => $this->secret_key,
		);
	}

	/**
	 * Generate signing key for AWS Signature Version 4
	 */
	private function get_signature_key( $key, $date_stamp, $region_name, $service_name ) {
		$k_date    = hash_hmac( 'sha256', $date_stamp, 'AWS4' . $key, true );
		$k_region  = hash_hmac( 'sha256', $region_name, $k_date, true );
		$k_service = hash_hmac( 'sha256', $service_name, $k_region, true );
		$k_signing = hash_hmac( 'sha256', 'aws4_request', $k_service, true );

		return $k_signing;
	}

	/**
	 * Format ISO 8601 date to MySQL datetime format
	 */
	private function format_date( $iso_date ) {
		$datetime = \DateTime::createFromFormat( \DateTime::ISO8601, $iso_date );
		if ( $datetime === false ) {
			// Fallback for different ISO 8601 formats
			$datetime = \DateTime::createFromFormat( 'Y-m-d\TH:i:s\Z', $iso_date );
		}

		return $datetime ? $datetime->format( 'Y-m-d H:i:s' ) : $iso_date;
	}

	/**
	 * Upload a file to Digital Ocean Spaces
	 */
	public function upload_file( $local_file_path, $remote_key, $content_type = 'application/octet-stream' ) {
		if ( ! $this->is_configured() ) {
			return array(
				'success' => false,
				'message' => 'Digital Ocean Spaces not configured',
			);
		}

		if ( ! file_exists( $local_file_path ) ) {
			return array(
				'success' => false,
				'message' => 'Local file does not exist',
			);
		}

		try {
			$file_content = file_get_contents( $local_file_path );
			$path         = '/' . $this->bucket_name . '/' . ltrim( $remote_key, '/' );
			$url          = $this->endpoint . $path;

			$headers                   = $this->get_auth_headers( 'PUT', $path );
			$headers['Content-Type']   = $content_type;
			$headers['Content-Length'] = strlen( $file_content );

			$response = wp_remote_request(
				$url,
				array(
					'method'  => 'PUT',
					'headers' => $headers,
					'body'    => $file_content,
					'timeout' => 120,
				)
			);

			if ( is_wp_error( $response ) ) {
				return array(
					'success' => false,
					'message' => 'Upload failed: ' . $response->get_error_message(),
				);
			}

			$status_code = wp_remote_retrieve_response_code( $response );

			if ( $status_code === 200 || $status_code === 201 ) {
				return array(
					'success' => true,
					'message' => 'File uploaded successfully',
					'url'     => $this->get_object_url( $remote_key ),
				);
			} else {
				return array(
					'success' => false,
					'message' => 'Upload failed with status code: ' . $status_code,
				);
			}
		} catch ( Exception $e ) {
			return array(
				'success' => false,
				'message' => 'Upload failed: ' . $e->getMessage(),
			);
		}
	}

	/**
	 * Delete an object from Digital Ocean Spaces
	 */
	public function delete_object( $key ) {
		if ( ! $this->is_configured() ) {
			return array(
				'success' => false,
				'message' => 'Digital Ocean Spaces not configured',
			);
		}

		try {
			$path = '/' . $this->bucket_name . '/' . ltrim( $key, '/' );
			$url  = $this->endpoint . $path;

			$headers = $this->get_auth_headers( 'DELETE', $path );

			$response = wp_remote_request(
				$url,
				array(
					'method'  => 'DELETE',
					'headers' => $headers,
					'timeout' => 30,
				)
			);

			if ( is_wp_error( $response ) ) {
				return array(
					'success' => false,
					'message' => 'Delete failed: ' . $response->get_error_message(),
				);
			}

			$status_code = wp_remote_retrieve_response_code( $response );

			if ( $status_code === 204 || $status_code === 200 ) {
				return array(
					'success' => true,
					'message' => 'Object deleted successfully',
				);
			} else {
				return array(
					'success' => false,
					'message' => 'Delete failed with status code: ' . $status_code,
				);
			}
		} catch ( Exception $e ) {
			return array(
				'success' => false,
				'message' => 'Delete failed: ' . $e->getMessage(),
			);
		}
	}
}
