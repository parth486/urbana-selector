<?php

namespace Urbana\Utils;

class DigitalOceanSpaces {

	private $bucket_name;
	private $region;
	private $endpoint;
	private $cdn_endpoint;
	private $access_key;
	private $secret_key;

	public function __construct() {
		$this->bucket_name = get_option( 'urbana_do_bucket_name', '' );
		$this->region      = get_option( 'urbana_do_region', 'nyc3' );
		$this->endpoint    = "https://{$this->region}.digitaloceanspaces.com";
		$this->cdn_endpoint = get_option( 'urbana_do_cdn_endpoint', '' );
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
		} catch ( \Exception $e ) {
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

		} catch ( \Exception $e ) {
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

		// Always generate signed URLs for private access
		$signed_url = $this->generate_signed_url( $key, 3600 ); // 1 hour expiration
		
		$debug_mode = (bool) get_option( 'urbana_debug_mode', false );
		if ( $debug_mode ) {
			error_log( "DigitalOcean: Generated signed URL for key '{$key}' -> '{$signed_url}'" );
		}
		
		return $signed_url;
	}

	public function generate_signed_url( $key, $expires_in_seconds = 3600 ) {
		if ( ! $this->is_configured() ) {
			return '';
		}

		// Use current time for signing
		$timestamp = time();
		$date = gmdate( 'Ymd\THis\Z', $timestamp );
		$date_stamp = gmdate( 'Ymd', $timestamp );
		
		// Use path-style URLs for DigitalOcean Spaces presigned URLs
		// This format works better with their S3-compatible API
		$host = "{$this->region}.digitaloceanspaces.com";

		// URL encode the path segments but preserve the structure
		// For path-style, canonical URI INCLUDES bucket name
		$path_segments = explode( '/', trim( $key, '/' ) );
		$encoded_segments = array_map( 'rawurlencode', $path_segments );
		$canonical_uri = '/' . $this->bucket_name . '/' . implode( '/', $encoded_segments );
		
		// Build query parameters (sorted alphabetically for canonical request)
		$query_params = array(
			'X-Amz-Algorithm' => 'AWS4-HMAC-SHA256',
			'X-Amz-Credential' => "{$this->access_key}/{$date_stamp}/{$this->region}/s3/aws4_request",
			'X-Amz-Date' => $date,
			'X-Amz-Expires' => (string) $expires_in_seconds,
			'X-Amz-SignedHeaders' => 'host'
		);
		
		// Sort parameters and build canonical querystring
		// NOTE: For X-Amz-Credential, forward slashes should NOT be encoded
		ksort( $query_params );
		$canonical_querystring_parts = array();
		foreach ( $query_params as $param => $value ) {
			// Special handling for X-Amz-Credential: don't encode forward slashes
			if ( $param === 'X-Amz-Credential' ) {
				$encoded_value = str_replace( '%2F', '/', rawurlencode( $value ) );
			} else {
				$encoded_value = rawurlencode( $value );
			}
			$canonical_querystring_parts[] = rawurlencode( $param ) . '=' . $encoded_value;
		}
		$canonical_querystring = implode( '&', $canonical_querystring_parts );

		$canonical_headers = "host:{$host}\n";
		$signed_headers = 'host';

		$payload_hash = hash( 'sha256', '' );
		$canonical_request = "GET\n{$canonical_uri}\n{$canonical_querystring}\n{$canonical_headers}\n{$signed_headers}\n{$payload_hash}";

		$algorithm = 'AWS4-HMAC-SHA256';
		$credential_scope = "{$date_stamp}/{$this->region}/s3/aws4_request";
		$string_to_sign = "{$algorithm}\n{$date}\n{$credential_scope}\n" . hash( 'sha256', $canonical_request );

		$signing_key = $this->get_signature_key( $this->secret_key, $date_stamp, $this->region, 's3' );
		$signature = hash_hmac( 'sha256', $string_to_sign, $signing_key );

		// Build final URL - canonical_uri already includes bucket name for path-style
		$signed_url = "https://{$host}{$canonical_uri}?{$canonical_querystring}&X-Amz-Signature={$signature}";
		
		return $signed_url;
	}

	/**
	 * Fetch a private file from DigitalOcean Spaces using Authorization header
	 * This method works reliably compared to presigned URLs
	 * 
	 * @param string $key The object key (path) to fetch
	 * @return array Array with 'success', 'data' (image content), 'content_type', and 'error' keys
	 */
	public function fetch_private_file( $key ) {
		if ( ! $this->is_configured() ) {
			return array(
				'success' => false,
				'error' => 'DigitalOcean Spaces not configured'
			);
		}

		// Generate timestamp for this request
		$timestamp = time();
		$date = gmdate( 'Ymd\THis\Z', $timestamp );
		$date_stamp = gmdate( 'Ymd', $timestamp );
		
		$host = "{$this->bucket_name}.{$this->region}.digitaloceanspaces.com";
		
		// URL encode the path segments
		$path_segments = explode( '/', trim( $key, '/' ) );
		$encoded_segments = array_map( 'rawurlencode', $path_segments );
		$canonical_uri = '/' . implode( '/', $encoded_segments );
		
		// Build canonical request for Authorization header
		$payload_hash = hash( 'sha256', '' );
		$canonical_headers = "host:{$host}\nx-amz-content-sha256:{$payload_hash}\nx-amz-date:{$date}\n";
		$signed_headers = 'host;x-amz-content-sha256;x-amz-date';
		
		$canonical_request = "GET\n{$canonical_uri}\n\n{$canonical_headers}\n{$signed_headers}\n{$payload_hash}";
		
		// Create string to sign
		$algorithm = 'AWS4-HMAC-SHA256';
		$credential_scope = "{$date_stamp}/{$this->region}/s3/aws4_request";
		$string_to_sign = "{$algorithm}\n{$date}\n{$credential_scope}\n" . hash( 'sha256', $canonical_request );
		
		// Calculate signature
		$signing_key = $this->get_signature_key( $this->secret_key, $date_stamp, $this->region, 's3' );
		$signature = hash_hmac( 'sha256', $string_to_sign, $signing_key );
		
		// Build Authorization header
		$authorization = "{$algorithm} Credential={$this->access_key}/{$credential_scope}, SignedHeaders={$signed_headers}, Signature={$signature}";
		
		// Make the request
		$url = "https://{$host}{$canonical_uri}";
		
		$response = wp_remote_get( $url, array(
			'timeout' => 30,
			'headers' => array(
				'Authorization' => $authorization,
				'x-amz-content-sha256' => $payload_hash,
				'x-amz-date' => $date,
				'Host' => $host
			)
		) );
		
		if ( is_wp_error( $response ) ) {
			return array(
				'success' => false,
				'error' => $response->get_error_message()
			);
		}
		
		$status_code = wp_remote_retrieve_response_code( $response );
		if ( $status_code !== 200 ) {
			$body = wp_remote_retrieve_body( $response );
			return array(
				'success' => false,
				'error' => "HTTP {$status_code}: " . substr( $body, 0, 200 )
			);
		}
		
		$image_data = wp_remote_retrieve_body( $response );
		$content_type = wp_remote_retrieve_header( $response, 'content-type' );
		
		return array(
			'success' => true,
			'data' => $image_data,
			'content_type' => $content_type
		);
	}

	/**
	 * Generate a presigned URL for accessing a private file from DigitalOcean Spaces
	 * This method creates a time-limited URL that can be used to access private objects
	 * 
	 * @param string $key The object key (path) to access
	 * @param int $expiration_seconds The number of seconds the URL should be valid (default: 3600 = 1 hour)
	 * @return array Array with 'success', 'url', and 'expires_at' keys
	 */
	public function generate_presigned_url( $key, $expiration_seconds = 3600 ) {
		$debug_mode = (bool) get_option( 'urbana_debug_mode', false );
		
		if ( ! $this->is_configured() ) {
			return array(
				'success' => false,
				'error' => 'DigitalOcean Spaces not configured'
			);
		}

		try {
			// Generate timestamps
			$now = time();
			$expires = $now + $expiration_seconds;
			$date = gmdate( 'Ymd\THis\Z', $now );
			$date_stamp = gmdate( 'Ymd', $now );
			
			$host = "{$this->bucket_name}.{$this->region}.digitaloceanspaces.com";
			
			// URL encode the path segments
			$path_segments = explode( '/', trim( $key, '/' ) );
			$encoded_segments = array_map( 'rawurlencode', $path_segments );
			$canonical_uri = '/' . implode( '/', $encoded_segments );
			
			// Build credential scope
			$credential_scope = "{$date_stamp}/{$this->region}/s3/aws4_request";
			
			// Build canonical query string for presigned URL
			$algorithm = 'AWS4-HMAC-SHA256';
			$credential = "{$this->access_key}/{$credential_scope}";
			
			$query_params = array(
				'X-Amz-Algorithm' => $algorithm,
				'X-Amz-Credential' => $credential,
				'X-Amz-Date' => $date,
				'X-Amz-Expires' => $expiration_seconds,
				'X-Amz-SignedHeaders' => 'host',
			);
			
			// Sort query parameters
			ksort( $query_params );
			
			// Build canonical query string
			$canonical_query_string = '';
			foreach ( $query_params as $key_param => $value_param ) {
				if ( ! empty( $canonical_query_string ) ) {
					$canonical_query_string .= '&';
				}
				$canonical_query_string .= rawurlencode( $key_param ) . '=' . rawurlencode( $value_param );
			}
			
			// Build canonical request for signature
			$payload_hash = 'UNSIGNED-PAYLOAD';
			$canonical_headers = "host:{$host}\n";
			$signed_headers = 'host';
			
			$canonical_request = "GET\n{$canonical_uri}\n{$canonical_query_string}\n{$canonical_headers}\n{$signed_headers}\n{$payload_hash}";
			
			// Create string to sign
			$string_to_sign = "{$algorithm}\n{$date}\n{$credential_scope}\n" . hash( 'sha256', $canonical_request );
			
			// Calculate signature
			$signing_key = $this->get_signature_key( $this->secret_key, $date_stamp, $this->region, 's3' );
			$signature = hash_hmac( 'sha256', $string_to_sign, $signing_key );
			
			// Build final presigned URL
			$presigned_url = "https://{$host}{$canonical_uri}?{$canonical_query_string}&X-Amz-Signature=" . rawurlencode( $signature );
			
			if ( $debug_mode ) {
				error_log( 'DigitalOceanSpaces: Generated presigned URL for: ' . $key );
				error_log( 'DigitalOceanSpaces: Host: ' . $host );
				error_log( 'DigitalOceanSpaces: Canonical URI: ' . $canonical_uri );
			}
			
			return array(
				'success' => true,
				'url' => $presigned_url,
				'expires_at' => gmdate( 'Y-m-d H:i:s', $expires ),
				'expires_in_seconds' => $expiration_seconds
			);
			
		} catch ( \Exception $e ) {
			if ( $debug_mode ) {
				error_log( 'DigitalOceanSpaces: Exception in generate_presigned_url: ' . $e->getMessage() );
			}
			return array(
				'success' => false,
				'error' => $e->getMessage()
			);
		}
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
								'img_conf'  => array(),
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
			// OR: category/range/product_code/img_conf/option_group/filename
			if ( count( $parts ) >= 5 ) {
				$category     = $parts[0];
				$range        = $parts[1];
				$product_code = $parts[2];
				$type         = $parts[3]; // 'images', 'downloads', or 'img_conf'

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
						'img_conf'  => array(),
					);
				}

				if ( $type === 'img_conf' && count( $parts ) >= 6 ) {
					// Handle option images: category/range/product_code/img_conf/option_group/filename
					$option_group = $parts[4];
					$filename     = $parts[5];

					if ( ! isset( $structured[ $category ][ $range ][ $product_code ]['img_conf'] ) ) {
						$structured[ $category ][ $range ][ $product_code ]['img_conf'] = array();
					}

					if ( ! isset( $structured[ $category ][ $range ][ $product_code ]['img_conf'][ $option_group ] ) ) {
						$structured[ $category ][ $range ][ $product_code ]['img_conf'][ $option_group ] = array();
					}

					// Extract option value from filename (without extension)
					$option_value = pathinfo( $filename, PATHINFO_FILENAME );

					$structured[ $category ][ $range ][ $product_code ]['img_conf'][ $option_group ][ $option_value ] = array(
						'filename' => $filename,
						'url'      => $object['url'],
						'size'     => $object['size'],
						'modified' => $object['last_modified'],
					);
				} elseif ( $type === 'images' && count( $parts ) === 5 ) {
					$filename = $parts[4];
					$structured[ $category ][ $range ][ $product_code ]['images'][] = array(
						'filename' => $filename,
						'url'      => $object['url'],
						'size'     => $object['size'],
						'modified' => $object['last_modified'],
					);
				} elseif ( $type === 'downloads' && count( $parts ) === 5 ) {
					$filename = $parts[4];
					$structured[ $category ][ $range ][ $product_code ]['downloads'][] = array(
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
			'cdn_endpoint'  => $this->cdn_endpoint,
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
		} catch ( \Exception $e ) {
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
		} catch ( \Exception $e ) {
			return array(
				'success' => false,
				'message' => 'Delete failed: ' . $e->getMessage(),
			);
		}
	}

	/**
	 * Create a folder in Digital Ocean Spaces by uploading a placeholder file
	 * S3-compatible services don't support empty folders, so we create a .keep file
	 */
	public function create_folder( $folder_path ) {
		if ( ! $this->is_configured() ) {
			$config_status = array(
				'bucket_name' => ! empty( $this->bucket_name ),
				'access_key' => ! empty( $this->access_key ),
				'secret_key' => ! empty( $this->secret_key ),
			);
			
			return array(
				'success' => false,
				'message' => 'Digital Ocean Spaces not configured',
				'config_status' => $config_status,
			);
		}

		try {
		// Ensure folder path ends with /
		$folder_path = rtrim( $folder_path, '/' ) . '/';
		
		// Create a .keep file to represent the folder
		$placeholder_key = $folder_path . '.keep';
		$path = '/' . $this->bucket_name . '/' . ltrim( $placeholder_key, '/' );
		$url = $this->endpoint . $path;

		// Log the request details for debugging
		$debug_mode = (bool) get_option( 'urbana_debug_mode', false );
		if ( $debug_mode ) {
			error_log( "Urbana: Creating folder at path: {$folder_path}" );
			error_log( "Urbana: PUT URL: {$url}" );
			error_log( "Urbana: Bucket: {$this->bucket_name}" );
			error_log( "Urbana: Region: {$this->region}" );
			error_log( "Urbana: Endpoint: {$this->endpoint}" );
		}

		// Empty content for the placeholder file
		$file_content = '# This file maintains the folder structure in Digital Ocean Spaces';

		$headers = $this->get_auth_headers( 'PUT', $path );
		$headers['Content-Type'] = 'text/plain';
		$headers['Content-Length'] = strlen( $file_content );

		$response = wp_remote_request(
			$url,
			array(
				'method'  => 'PUT',
				'headers' => $headers,
				'body'    => $file_content,
				'timeout' => 60,
			)
		);

		if ( is_wp_error( $response ) ) {
			$error_message = $response->get_error_message();
			if ( $debug_mode ) {
				error_log( "Urbana: WP Error creating folder: {$error_message}" );
			}
			
			return array(
				'success' => false,
				'message' => 'Folder creation failed: ' . $error_message,
				'error_details' => array(
					'type' => 'wp_error',
					'url' => $url,
					'path' => $path,
				),
			);
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$response_body = wp_remote_retrieve_body( $response );
		
		// Log response details
		if ( $debug_mode ) {
			error_log( "Urbana: Response status: {$status_code}" );
			if ( $status_code !== 200 && $status_code !== 201 ) {
				error_log( "Urbana: Response body: " . substr( $response_body, 0, 500 ) );
			}
		}			if ( $status_code === 200 || $status_code === 201 ) {
				return array(
					'success' => true,
					'message' => 'Folder created successfully',
					'folder_path' => $folder_path,
					'placeholder_url' => $this->get_object_url( $placeholder_key ),
				);
			} else {
				return array(
					'success' => false,
					'message' => 'Folder creation failed with status code: ' . $status_code,
					'error_details' => array(
						'status_code' => $status_code,
						'response_body' => $response_body,
						'url' => $url,
						'path' => $path,
					),
				);
			}
		} catch ( \Exception $e ) {
			$error_message = $e->getMessage();
			$debug_mode = (bool) get_option( 'urbana_debug_mode', false );
			if ( $debug_mode ) {
				error_log( "Urbana: Exception creating folder: {$error_message}" );
			}
			
			return array(
				'success' => false,
				'message' => 'Folder creation failed: ' . $error_message,
				'error_details' => array(
					'type' => 'exception',
					'exception' => $error_message,
				),
			);
		}
	}

	/**
	 * Create folder structure for a product group
	 */
	public function create_group_folders( $group_name, $base_path = '' ) {
		$sanitized_group = $this->sanitize_path_segment( $group_name );
		$group_path = empty( $base_path ) ? $sanitized_group : $base_path . '/' . $sanitized_group;
		
		$results = array();
		
		// Create main group folder
		$result = $this->create_folder( $group_path );
		$results[] = array(
			'path' => $group_path,
			'type' => 'group',
			'result' => $result
		);

		return array(
			'success' => count( array_filter( $results, function( $r ) { return $r['result']['success']; } ) ) > 0,
			'message' => 'Group folder structure creation completed',
			'results' => $results,
			'group_name' => $group_name,
			'base_path' => $group_path,
		);
	}

	/**
	 * Create folder structure for a product range
	 */
	public function create_range_folders( $group_name, $range_name, $base_path = '' ) {
		$debug_mode = (bool) get_option( 'urbana_debug_mode', false );
		if ( $debug_mode ) {
			error_log( "DigitalOceanSpaces: create_range_folders called - group: '{$group_name}', range: '{$range_name}', base_path: '{$base_path}'" );
		}
		
		$sanitized_group = $this->sanitize_path_segment( $group_name );
		$sanitized_range = $this->sanitize_path_segment( $range_name );
		$range_path = empty( $base_path ) ? $sanitized_group . '/' . $sanitized_range : $base_path . '/' . $sanitized_group . '/' . $sanitized_range;
		
		if ( $debug_mode ) {
			error_log( "DigitalOceanSpaces: sanitized group: '{$sanitized_group}', range: '{$sanitized_range}', final path: '{$range_path}'" );
		}
		
		$results = array();
		
		// Create range folder
		if ( $debug_mode ) {
			error_log( "DigitalOceanSpaces: Creating folder at path: " . $range_path );
		}
		$result = $this->create_folder( $range_path );
		if ( $debug_mode ) {
			error_log( "DigitalOceanSpaces: create_folder result: " . wp_json_encode( $result ) );
		}
		
		$results[] = array(
			'path' => $range_path,
			'type' => 'range',
			'result' => $result
		);

		$success = count( array_filter( $results, function( $r ) { return $r['result']['success']; } ) ) > 0;
		if ( $debug_mode ) {
			error_log( "DigitalOceanSpaces: create_range_folders final success: " . ( $success ? 'true' : 'false' ) );
		}

		return array(
			'success' => $success,
			'message' => 'Range folder structure creation completed',
			'results' => $results,
			'group_name' => $group_name,
			'range_name' => $range_name,
			'path' => $range_path,
		);
	}

	/**
	 * Create folder structure for a product
	 */
	public function create_product_folders( $group_name, $range_name, $product_code, $base_path = '' ) {
		$sanitized_group = $this->sanitize_path_segment( $group_name );
		$sanitized_range = $this->sanitize_path_segment( $range_name );
		$sanitized_product = $this->sanitize_path_segment( $product_code );
		$product_base_path = empty( $base_path ) ? $sanitized_group . '/' . $sanitized_range . '/' . $sanitized_product : $base_path . '/' . $sanitized_group . '/' . $sanitized_range . '/' . $sanitized_product;
		
		$results = array();
		
		// Create product base folder
		$result = $this->create_folder( $product_base_path );
		$results[] = array(
			'path' => $product_base_path,
			'type' => 'product_base',
			'result' => $result
		);

		// Create images subfolder
		$images_path = $product_base_path . '/images';
		$result = $this->create_folder( $images_path );
		$results[] = array(
			'path' => $images_path,
			'type' => 'product_images',
			'result' => $result
		);

		// Create downloads subfolder
		$downloads_path = $product_base_path . '/downloads';
		$result = $this->create_folder( $downloads_path );
		$results[] = array(
			'path' => $downloads_path,
			'type' => 'product_downloads',
			'result' => $result
		);

		return array(
			'success' => count( array_filter( $results, function( $r ) { return $r['result']['success']; } ) ) > 0,
			'message' => 'Product folder structure creation completed',
			'results' => $results,
			'group_name' => $group_name,
			'range_name' => $range_name,
			'product_code' => $product_code,
			'base_path' => $product_base_path,
		);
	}

	/**
	 * Check if folders exist for groups, ranges, or products
	 */
	public function check_folders_exist( $items, $type ) {
		$debug_mode = (bool) get_option( 'urbana_debug_mode', false );
		if ( $debug_mode ) {
			error_log('GOD_DEBUG: check_folders_exist called with type: ' . $type . ' and items: ' . print_r($items, true));
		}
		if ( ! $this->is_configured() ) {
			return array(
				'success' => false,
				'message' => 'Digital Ocean Spaces not configured',
			);
		}

		try {
			$results = array();
			
			foreach ( $items as $item ) {
				$folder_path = '';
				
				switch ( $type ) {
					case 'groups':
						$folder_path = $this->sanitize_path_segment( $item['name'] ) . '/';
						break;
						
					case 'ranges':
						// For ranges, we need to check if they exist under their parent group
						// This is a simplified check - in reality, ranges could be under multiple groups
						$group_name = isset( $item['group_name'] ) ? $item['group_name'] : 'default-group';
						$folder_path = $this->sanitize_path_segment( $group_name ) . '/' . $this->sanitize_path_segment( $item['name'] ) . '/';
						break;
						
					case 'products':
						// For products, check under their range and group structure
						$group_name = isset( $item['group_name'] ) ? $item['group_name'] : 'default-group';
						$range_name = isset( $item['range_name'] ) ? $item['range_name'] : 'default-range';
						$product_code = isset( $item['code'] ) ? $item['code'] : $this->sanitize_path_segment( $item['name'] );
						$folder_path = $this->sanitize_path_segment( $group_name ) . '/' . 
									   $this->sanitize_path_segment( $range_name ) . '/' . 
									   $this->sanitize_path_segment( $product_code ) . '/';
						break;
				}
				
				// Check if the folder exists by looking for the .keep file
				$keep_file_path = $folder_path . '.keep';
				if ( $debug_mode ) {
					error_log('GOD_DEBUG: Checking object existence for: ' . $keep_file_path);
				}
				$exists = $this->check_object_exists( $keep_file_path );
				if ( $debug_mode ) {
					error_log('GOD_DEBUG: check_object_exists result for ' . $keep_file_path . ': ' . var_export($exists, true));
				}
				
				$results[ $item['id'] ] = array(
					'exists' => $exists,
					'path' => $folder_path,
					'GOD_DEBUG' => array(
						'keep_file_path' => $keep_file_path,
						'checked_id' => $item['id'],
						'check_result' => $exists
					)
				);
			}
			
			if ( $debug_mode ) {
				error_log('GOD_DEBUG: check_folders_exist results: ' . print_r($results, true));
			}
			return array(
				'success' => true,
				'results' => $results,
			);
			
		} catch ( \Exception $e ) {
			return array(
				'success' => false,
				'message' => 'Error checking folders: ' . $e->getMessage(),
			);
		}
	}
	
	/**
	 * Check if a specific object exists in the bucket
	 */
	public function check_object_exists( $object_key ) {
		try {
			$url = $this->endpoint . '/' . $this->bucket_name . '/' . ltrim( $object_key, '/' );
			$path = '/' . $this->bucket_name . '/' . ltrim( $object_key, '/' );
			
			error_log( "DigitalOceanSpaces: check_object_exists - Checking: {$url}" );
			
			$headers = $this->get_auth_headers( 'HEAD', $path );

			$response = wp_remote_head(
				$url,
				array(
					'headers' => $headers,
					'timeout' => 5, // Reduced from 10 to 5 seconds
				)
			);

			if ( is_wp_error( $response ) ) {
				error_log( "DigitalOceanSpaces: check_object_exists - WP Error: " . $response->get_error_message() );
				return false;
			}

			$status_code = wp_remote_retrieve_response_code( $response );
			error_log( "DigitalOceanSpaces: check_object_exists - Status code: {$status_code}" );
			return $status_code === 200;
			
		} catch ( \Exception $e ) {
			error_log( "DigitalOceanSpaces: check_object_exists - Exception: " . $e->getMessage() );
			return false;
		}
	}

	/**
	 * Get a list of all folder names in Digital Ocean Spaces (FAST)
	 * This makes ONE API call instead of checking each folder individually
	 * Includes caching to reduce API calls further
	 * Works WITHOUT requiring .keep files - detects actual S3 prefixes
	 * 
	 * @param bool $force_refresh Force refresh the cache
	 * @return array Array of folder paths (without trailing slashes)
	 */
	public function list_all_folder_names( $force_refresh = false ) {
		$cache_key = 'urbana_do_folder_list';
		$cache_duration = 300; // 5 minutes in seconds
		
		// Try to get from cache first
		if ( ! $force_refresh ) {
			$cached = get_transient( $cache_key );
			if ( $cached !== false ) {
				error_log( "DigitalOceanSpaces: Using cached folder list (" . count( $cached ) . " folders)" );
				return $cached;
			}
		}
		
		try {
			error_log( "DigitalOceanSpaces: Fetching fresh folder list from Digital Ocean (using S3 prefixes)" );
			
			$all_folders = array();
			
			// Recursively get all folder prefixes at all levels
			$this->recursively_list_folders( '', $all_folders );
			
			// Sort alphabetically
			sort( $all_folders );
			
			error_log( "DigitalOceanSpaces: Found " . count( $all_folders ) . " unique folders" );
			error_log( "DigitalOceanSpaces: First 20 folders: " . implode( ', ', array_slice( $all_folders, 0, 20 ) ) );
			
			// Cache the result
			set_transient( $cache_key, $all_folders, $cache_duration );
			error_log( "DigitalOceanSpaces: Cached folder list for {$cache_duration} seconds" );
			
			return $all_folders;
			
		} catch ( \Exception $e ) {
			error_log( "DigitalOceanSpaces: list_all_folder_names - Exception: " . $e->getMessage() );
			return array();
		}
	}

	/**
	 * Recursively list all folders using S3 CommonPrefixes
	 * This detects ALL folders including empty ones, without needing .keep files
	 * 
	 * @param string $prefix Current prefix to search under
	 * @param array &$folders Reference to array where folders are accumulated
	 */
	private function recursively_list_folders( $prefix, &$folders ) {
		if ( ! $this->is_configured() ) {
			return;
		}

		try {
			$query_params = array(
				'list-type' => '2',
				'delimiter' => '/',
				'max-keys'  => 1000,
			);

			if ( ! empty( $prefix ) ) {
				$query_params['prefix'] = $prefix;
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
				error_log( "DigitalOceanSpaces: recursively_list_folders - WP Error: " . $response->get_error_message() );
				return;
			}

			$status_code = wp_remote_retrieve_response_code( $response );
			$body        = wp_remote_retrieve_body( $response );

			if ( $status_code !== 200 ) {
				error_log( "DigitalOceanSpaces: recursively_list_folders - Failed. Status: {$status_code}" );
				return;
			}

			// Parse XML response
			$xml = simplexml_load_string( $body );
			if ( ! $xml ) {
				error_log( "DigitalOceanSpaces: recursively_list_folders - Failed to parse XML" );
				return;
			}

			// Register namespace
			$xml->registerXPathNamespace( 's3', 'http://s3.amazonaws.com/doc/2006-03-01/' );

			// Get CommonPrefixes (these are the subfolders)
			$common_prefixes = $xml->xpath( '//s3:CommonPrefixes/s3:Prefix' );
			
			if ( $common_prefixes ) {
				foreach ( $common_prefixes as $prefix_element ) {
					$folder_path = (string) $prefix_element;
					// Remove trailing slash
					$folder_path = rtrim( $folder_path, '/' );
					
					if ( ! empty( $folder_path ) && ! in_array( $folder_path, $folders ) ) {
						$folders[] = $folder_path;
						
						// Recursively list subfolders
						$this->recursively_list_folders( $folder_path . '/', $folders );
					}
				}
			}
			
		} catch ( \Exception $e ) {
			error_log( "DigitalOceanSpaces: recursively_list_folders - Exception: " . $e->getMessage() );
		}
	}
	
	/**
	 * Check if a folder exists in a pre-fetched list of folders
	 * This is MUCH faster than calling check_folder_exists multiple times
	 * 
	 * @param string $folder_name The folder name to check (e.g., "Shelter")
	 * @param array  $folder_list List of existing folders from list_all_folder_names()
	 * @return bool True if folder exists, false otherwise
	 */
	public function folder_exists_in_list( $folder_name, $folder_list ) {
		$sanitized = $this->sanitize_folder_path( $folder_name );
		
		// Check each folder in the list
		foreach ( $folder_list as $existing_folder ) {
			// Remove trailing slashes and .keep files from comparison
			$clean_existing = rtrim( $existing_folder, '/' );
			$clean_existing = str_replace( '/.keep', '', $clean_existing );
			
			$existing_lower = strtolower( $clean_existing );
			$sanitized_lower = strtolower( $sanitized );
			
			// Check multiple matching strategies
			$exact_match = $existing_lower === $sanitized_lower;
			$basename_match = basename( $existing_lower ) === $sanitized_lower;
			$ends_with_match = str_ends_with( $existing_lower, '/' . $sanitized_lower );
			
			if ( $exact_match || $basename_match || $ends_with_match ) {
				return true;
			}
		}
		
		return false;
	}

	/**
	 * Check if a folder exists by checking for .keep file
	 * Optimized to reduce API calls and improve speed
	 */
	public function check_folder_exists( $folder_path ) {
		$sanitized_path = $this->sanitize_folder_path( $folder_path );
		error_log( "DigitalOceanSpaces: Checking folder: '{$folder_path}' -> '{$sanitized_path}'" );
		
		// Strategy 1 & 2 combined: Check both .keep file paths in one go
		// Most folders will have .keep files, so check these first
		$paths_to_check = array();
		$paths_to_check[] = rtrim( $sanitized_path, '/' ) . '/.keep';
		if ( $folder_path !== $sanitized_path ) {
			$paths_to_check[] = rtrim( $folder_path, '/' ) . '/.keep';
		}
		
		foreach ( $paths_to_check as $keep_file_path ) {
			if ( $this->check_object_exists( $keep_file_path ) ) {
				error_log( "DigitalOceanSpaces: ✓ Found: {$keep_file_path}" );
				return true;
			}
		}
		
		// Strategy 3: Only try listing if .keep files don't exist
		// This is slower, so only do it as fallback for legacy folders
		error_log( "DigitalOceanSpaces: No .keep file found, trying folder listing" );
		if ( $this->folder_has_contents( $sanitized_path ) ) {
			error_log( "DigitalOceanSpaces: ✓ Found via listing: {$sanitized_path}" );
			return true;
		}
		
		   // Strategy 4: Check original case only if different
		   if ( $folder_path !== $sanitized_path && $this->folder_has_contents( $folder_path ) ) {
			   error_log( "DigitalOceanSpaces: ✓ Found via listing: {$folder_path}" );
			   return true;
		   }

		   // Strategy 5: Case-insensitive check against all folder names in Spaces
		   $all_folders = $this->list_all_folder_names();
		   $target_lower = strtolower(rtrim($folder_path, '/'));
		   // Precompute sanitized form of target for robust matching
		   $target_sanitized = strtolower( $this->sanitize_folder_path( $folder_path ) );
		   error_log("[DO SYNC DEBUG] ============================================");
		   error_log("[DO SYNC DEBUG] Checking folder: {$folder_path}");
		   error_log("[DO SYNC DEBUG] Target (lower): {$target_lower}");
		   error_log("[DO SYNC DEBUG] Total folders: " . count($all_folders));
		   
		   $match_found = false;
		   foreach ($all_folders as $existing_folder) {
			   $existing_lower = strtolower(rtrim($existing_folder, '/'));
			   // Also compute sanitized form of existing folder for more tolerant matching
			   $existing_sanitized = strtolower( $this->sanitize_folder_path( $existing_folder ) );
			   
			   // Only log if this folder is a potential match (contains part of target)
			   if (strpos($existing_lower, $target_lower) !== false || strpos($target_lower, $existing_lower) !== false) {
				   error_log("[DO SYNC DEBUG] Comparing: '{$existing_lower}' vs '{$target_lower}'");
			   }
			   // Direct match
			   if ($existing_lower === $target_lower) {
				   error_log("DigitalOceanSpaces: ✓ Found via case-insensitive folder list: {$existing_folder}");
				   return true;
			   }

			   // If the target is a nested path like "Banksia/U201" and the existing entry
			   // contains a group prefix (e.g. "Shelters/Banksia/U201"), allow ends-with match
			   if ( str_ends_with( $existing_lower, '/' . $target_lower ) || strpos( $existing_lower, '/' . $target_lower ) !== false ) {
				   if ( is_array( $debug ) ) {
					   $debug['case_insensitive_check']['matched_nested'] = $existing_folder;
				   }
				   error_log( "DigitalOceanSpaces: ✓ Found via nested/ends-with match: {$existing_folder}" );
				   return true;
			   }

			   // Match against sanitized forms (handles spaces/hyphens, punctuation, etc.)
			   if ( $existing_sanitized === $target_sanitized ) {
				   if ( is_array( $debug ) ) {
					   $debug['case_insensitive_check']['matched_sanitized'] = $existing_folder;
				   }
				   error_log( "DigitalOceanSpaces: ✓ Found (sanitized match): {$existing_folder}" );
				   return true;
			   }

			   // Also try flexible replacements: spaces <-> hyphens
			   $existing_flex = str_replace( array( ' ', '_' ), '-', $existing_sanitized );
			   $target_flex = str_replace( array( ' ', '_' ), '-', $target_sanitized );
			   if ( $existing_flex === $target_flex ) {
				   if ( is_array( $debug ) ) {
					   $debug['case_insensitive_check']['matched_flexible'] = $existing_folder;
				   }
				   error_log( "DigitalOceanSpaces: ✓ Found (flex match): {$existing_folder}" );
				   return true;
			   }

			   // Try matching basename segments if full path didn't match
			   $existing_basename = basename( $existing_lower );
			   if ( $existing_basename === $target_lower || $existing_basename === $target_sanitized || ( $existing_basename === $existing_flex && $existing_basename === $target_flex ) ) {
				   if ( is_array( $debug ) ) {
					   $debug['case_insensitive_check']['matched_basename'] = $existing_folder;
				   }
				   error_log( "DigitalOceanSpaces: ✓ Found (basename match): {$existing_folder}" );
				   return true;
			   }
		   }

		   error_log( "DigitalOceanSpaces: ✗ Not found" );
		   return false;
	}
	
	/**
	 * Check if a folder has any contents by listing objects with the folder prefix
	 */
	private function folder_has_contents( $folder_path ) {
		try {
			$prefix = ltrim( $folder_path, '/' ) . '/';
			$query_params = array(
				'list-type' => '2',
				'prefix' => $prefix,
				'max-keys' => '1'
			);
			$query_string = http_build_query( $query_params );
			
			$url = $this->endpoint . '/' . $this->bucket_name . '/?' . $query_string;
			$path = '/' . $this->bucket_name . '/';
			
			error_log( "DigitalOceanSpaces: Listing contents of: {$prefix}" );
			error_log( "DigitalOceanSpaces: URL: {$url}" );
			
			$headers = $this->get_auth_headers( 'GET', $path, $query_string );

			$response = wp_remote_get(
				$url,
				array(
					'headers' => $headers,
					'timeout' => 5, // Reduced from 10 to 5 seconds
				)
			);

			if ( is_wp_error( $response ) ) {
				error_log( "DigitalOceanSpaces: folder_has_contents - WP Error: " . $response->get_error_message() );
				return false;
			}

			$status_code = wp_remote_retrieve_response_code( $response );
			if ( $status_code !== 200 ) {
				error_log( "DigitalOceanSpaces: folder_has_contents - Status: {$status_code}" );
				$body = wp_remote_retrieve_body( $response );
				error_log( "DigitalOceanSpaces: folder_has_contents - Response body: " . substr( $body, 0, 500 ) );
				return false;
			}
			
			$body = wp_remote_retrieve_body( $response );
			// Check if the response contains any <Contents> elements
			$has_contents = strpos( $body, '<Contents>' ) !== false;
			error_log( "DigitalOceanSpaces: folder_has_contents - Has contents: " . ( $has_contents ? 'yes' : 'no' ) );
			
			return $has_contents;
			
		} catch ( \Exception $e ) {
			error_log( "DigitalOceanSpaces: folder_has_contents - Exception: " . $e->getMessage() );
			return false;
		}
	}

	/**
	 * Sanitize a complete folder path by sanitizing each segment
	 */
	private function sanitize_folder_path( $path ) {
		$segments = array_filter( explode( '/', $path ) );
		$sanitized_segments = array_map( array( $this, 'sanitize_path_segment' ), $segments );
		return implode( '/', $sanitized_segments );
	}

	/**
	 * Sanitize a path segment for use in Digital Ocean Spaces
	 * By default this converts to lowercase to ensure case-insensitive folder structure.
	 * There is an opt-in setting (urbana_do_preserve_folder_case) which, when true,
	 * preserves the original case of the provided segment (still trims and cleans
	 * unwanted characters).
	 */
	private function sanitize_path_segment( $segment ) {
		// Replace special characters and multiple spaces with single space
		$cleaned = preg_replace( '/[^a-zA-Z0-9\s\-_]/', ' ', $segment );
		// Replace multiple spaces with single space
		$cleaned = preg_replace( '/\s+/', ' ', $cleaned );
		// If the plugin is configured to preserve folder case, return cleaned value unchanged
		$preserve_case = get_option( 'urbana_do_preserve_folder_case', false );
		$trimmed = trim( $cleaned );
		if ( $preserve_case ) {
			return $trimmed;
		}

		// Default behaviour: convert to lowercase for case-insensitive handling
		return strtolower( $trimmed );
	}

	/**
	 * Rename a folder in Digital Ocean Spaces by copying all contents to new path and deleting old
	 *
	 * @param string $old_path Old folder path
	 * @param string $new_path New folder path
	 * @return array Result with success status and details
	 */
	public function rename_folder( $old_path, $new_path ) {
		if ( ! $this->is_configured() ) {
			return array(
				'success' => false,
				'message' => 'Digital Ocean Spaces not configured',
			);
		}

		error_log( "DigitalOceanSpaces: Renaming folder from '{$old_path}' to '{$new_path}'" );

		// Sanitize paths
		$old_path = $this->sanitize_folder_path( $old_path );
		$new_path = $this->sanitize_folder_path( $new_path );

		// List all objects in the old folder
		$list_result = $this->list_objects( $old_path );
		
		if ( ! $list_result['success'] ) {
			return array(
				'success' => false,
				'message' => 'Failed to list objects in source folder: ' . $list_result['message'],
			);
		}

		$objects_to_move = $list_result['objects'];
		$files_moved     = 0;
		$folders_moved   = 0;
		$errors          = array();

		error_log( "DigitalOceanSpaces: Found " . count( $objects_to_move ) . " objects to move" );

		// Copy each object to the new path
		foreach ( $objects_to_move as $object ) {
			$old_key = $object['key'];
			
			// Calculate new key by replacing the old path prefix with new path
			$relative_path = substr( $old_key, strlen( $old_path ) );
			$new_key       = $new_path . $relative_path;

			error_log( "DigitalOceanSpaces: Moving '{$old_key}' -> '{$new_key}'" );

			// Copy object to new location
			$copy_result = $this->copy_object( $old_key, $new_key );
			
			if ( $copy_result['success'] ) {
				// Delete old object after successful copy
				$delete_result = $this->delete_object( $old_key );
				
				if ( $delete_result['success'] ) {
					if ( strpos( $old_key, '/.keep' ) !== false || substr( $old_key, -1 ) === '/' ) {
						$folders_moved++;
					} else {
						$files_moved++;
					}
				} else {
					$errors[] = "Failed to delete old object: {$old_key}";
				}
			} else {
				$errors[] = "Failed to copy object: {$old_key} -> {$new_key}";
			}
		}

		// Delete the old folder's .keep file if it exists
		$old_keep = rtrim( $old_path, '/' ) . '/.keep';
		$this->delete_object( $old_keep );

		// Create .keep file in new folder
		$new_keep_result = $this->create_folder( $new_path );

		$success = count( $errors ) === 0 && $files_moved + $folders_moved > 0;

		return array(
			'success'       => $success,
			'message'       => $success 
				? "Successfully renamed folder from '{$old_path}' to '{$new_path}'"
				: "Rename completed with errors",
			'files_moved'   => $files_moved,
			'folders_moved' => $folders_moved,
			'errors'        => $errors,
		);
	}

	/**
	 * Copy an object from one location to another within the same bucket
	 *
	 * @param string $source_key Source object key
	 * @param string $dest_key Destination object key
	 * @return array Result with success status
	 */
	private function copy_object( $source_key, $dest_key ) {
		try {
			$copy_source = '/' . $this->bucket_name . '/' . ltrim( $source_key, '/' );
			$path        = '/' . $this->bucket_name . '/' . ltrim( $dest_key, '/' );
			$url         = $this->endpoint . $path;

			$headers                       = $this->get_auth_headers( 'PUT', $path );
			$headers['x-amz-copy-source']  = $copy_source;
			$headers['x-amz-metadata-directive'] = 'COPY';

			$response = wp_remote_request(
				$url,
				array(
					'method'  => 'PUT',
					'headers' => $headers,
					'timeout' => 30,
				)
			);

			if ( is_wp_error( $response ) ) {
				return array(
					'success' => false,
					'message' => $response->get_error_message(),
				);
			}

			$status_code = wp_remote_retrieve_response_code( $response );
			
			if ( $status_code === 200 ) {
				return array( 'success' => true );
			}

			return array(
				'success' => false,
				'message' => "Copy failed with status code: {$status_code}",
			);
		} catch ( \Exception $e ) {
			return array(
				'success' => false,
				'message' => $e->getMessage(),
			);
		}
	}

	/**
	 * Check if a folder exists in Digital Ocean Spaces
	 */
	public function folder_exists( $folder_path, &$debug = null ) {
		// GOD_DEBUG: Start folder_exists
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log('GOD_DEBUG: folder_exists called for: ' . $folder_path);
		}
		   // Normalize folder path
		   $folder_path = rtrim( $folder_path, '/' ) . '/';
		   if (is_array($debug)) {
			   $debug['input'] = $folder_path;
		   }
		
		   // Check if the folder exists by looking for the .keep file or any object with this prefix
		   $keep_file_path = $folder_path . '.keep';
		   if (is_array($debug)) {
			   $debug['keep_file_path'] = $keep_file_path;
		   }
		
		// First check for .keep file
		   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			   error_log('GOD_DEBUG: Checking .keep file existence for: ' . $keep_file_path);
		   }
		   if ( $this->check_object_exists( $keep_file_path ) ) {
			   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				   error_log('GOD_DEBUG: .keep file FOUND for: ' . $keep_file_path);
			   }
			   if (is_array($debug)) {
				   $debug['keep_file_found'] = true;
			   }
			   return true;
		   }
		   if (is_array($debug)) {
			   $debug['keep_file_found'] = false;
		   }
		   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			   error_log('GOD_DEBUG: .keep file NOT found for: ' . $keep_file_path);
		   }
		
		// If no .keep file, check if any objects exist with this prefix
		   try {
			   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				   error_log('GOD_DEBUG: Checking for any object with prefix: ' . $folder_path);
			   }
			   $objects = $this->list_objects( $folder_path, 1 ); // Only get 1 object to check existence
			   // list_objects returns an array like ['success'=>true, 'objects'=>[...] ]
			   $has_contents = false;
			   if ( is_array( $objects ) && isset( $objects['objects'] ) && is_array( $objects['objects'] ) ) {
				   $has_contents = count( $objects['objects'] ) > 0;
			   }
			   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				   error_log('GOD_DEBUG: list_objects result for ' . $folder_path . ': ' . print_r($objects, true));
			   }
			   if (is_array($debug)) {
				   $debug['has_contents'] = $has_contents;
			   }
			   if ($has_contents) {
				   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
					   error_log('GOD_DEBUG: Found object(s) with prefix: ' . $folder_path);
				   }
				   return true;
			   }
		   } catch ( \Exception $e ) {
			   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				   error_log( 'GOD_DEBUG: folder_exists error - ' . $e->getMessage() );
			   }
			   if (is_array($debug)) {
				   $debug['error'] = $e->getMessage();
			   }
			   return false;
		   }

		   // Strategy 5: Case-insensitive check against all folder names in Spaces
		   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			   error_log('GOD_DEBUG: Performing case-insensitive check for: ' . $folder_path);
		   }
		   $all_folders = $this->list_all_folder_names();
		   if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			   error_log('GOD_DEBUG: list_all_folder_names returned: ' . print_r($all_folders, true));
		   }
		   $target_lower = strtolower(rtrim($folder_path, '/'));
		   if (is_array($debug)) {
			   $debug['case_insensitive_check'] = array(
				   'target' => $folder_path,
				   'target_lower' => $target_lower,
				   'all_folders' => $all_folders,
				   'comparisons' => array()
			   );
		   }
		   foreach ($all_folders as $existing_folder) {
			   $existing_lower = strtolower(rtrim($existing_folder, '/'));
			   if (is_array($debug)) {
				   $debug['case_insensitive_check']['comparisons'][] = array(
					   'existing' => $existing_folder,
					   'existing_lower' => $existing_lower,
					   'target_lower' => $target_lower,
					   'match' => $existing_lower === $target_lower
				   );
			   }
			   if ($existing_lower === $target_lower) {
				   if (is_array($debug)) {
					   $debug['case_insensitive_check']['matched'] = $existing_folder;
				   }
				   error_log("DigitalOceanSpaces: ✓ Found via case-insensitive folder list: {$existing_folder}");
				   return true;
			   }
		   }
		   if (is_array($debug)) {
			   $debug['case_insensitive_check']['matched'] = false;
			   if ( isset( $target_sanitized ) ) {
				   $debug['case_insensitive_check']['target_sanitized'] = $target_sanitized;
			   }
			   $debug['case_insensitive_check']['existing_sanitized_examples'] = array_map(function($f){return $this->sanitize_folder_path($f);}, array_slice($all_folders,0,20));
		   }
		   error_log( "DigitalOceanSpaces: ✗ Not found" );
		   return false;
	}

	/**
	 * List files in a specific folder
	 */
	public function list_files( $folder_path, $max_files = 1000 ) {
		// Normalize folder path
		$folder_path = rtrim( $folder_path, '/' ) . '/';
		
		try {
			$objects = $this->list_objects( $folder_path, $max_files );
			
			$files = array();
			
			// Accept both shapes: modern ['objects'=>[..]] and older ['Contents'=> SimpleXML list]
			$source_objects = array();
			if ( ! empty( $objects['objects'] ) && is_array( $objects['objects'] ) ) {
				$source_objects = $objects['objects'];
			} elseif ( ! empty( $objects['Contents'] ) && is_array( $objects['Contents'] ) ) {
				$source_objects = $objects['Contents'];
			}

			if ( ! empty( $source_objects ) ) {
				foreach ( $source_objects as $object ) {
					// Support both SimpleXML-derived items (Key/Size/LastModified)
					// and our normalized list_objects format (key/size/last_modified)
					$key = isset( $object['Key'] ) ? (string) $object['Key'] : ( isset( $object['key'] ) ? $object['key'] : '' );
					
					// Skip .keep files and folders (keys ending with /)
					if ( str_ends_with( $key, '.keep' ) || str_ends_with( $key, '/' ) ) {
						continue;
					}
					
					// Only include files directly in this folder (not in subfolders)
					$relative_path = str_replace( $folder_path, '', $key );
					if ( strpos( $relative_path, '/' ) === false ) {
						$files[] = array(
							'key' => $key,
							'name' => basename( $key ),
							'size' => isset( $object['Size'] ) ? $object['Size'] : ( isset( $object['size'] ) ? $object['size'] : 0 ),
							'lastModified' => isset( $object['LastModified'] ) ? $object['LastModified'] : ( isset( $object['last_modified'] ) ? $object['last_modified'] : '' ),
							'url' => $this->get_object_url( $key )
						);
					}
				}
			}
			
			return $files;
			
		} catch ( \Exception $e ) {
			error_log( "DigitalOceanSpaces: list_files error - " . $e->getMessage() );
			throw $e;
		}
	}

}

