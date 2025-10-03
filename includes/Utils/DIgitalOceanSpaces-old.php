<?php

namespace Urbana\Utils;

use Aws\S3\S3Client;
use Aws\Exception\AwsException;

class DigitalOceanSpaces {

	private $s3_client;
	private $bucket_name;
	private $region;
	private $endpoint;
	private $sdk_available;

	public function __construct() {

			// Check if AWS SDK is available
		$this->sdk_available = class_exists( 'Aws\S3\S3Client' );

		if ( ! $this->sdk_available ) {
			return;
		}

		$this->bucket_name = get_option( 'urbana_do_bucket_name', '' );
		$this->region      = get_option( 'urbana_do_region', 'nyc3' );
		$this->endpoint    = "https://{$this->region}.digitaloceanspaces.com";

		$access_key = get_option( 'urbana_do_access_key', '' );
		$secret_key = get_option( 'urbana_do_secret_key', '' );

		if ( ! empty( $access_key ) && ! empty( $secret_key ) ) {
			try {
				$this->s3_client = new S3Client(
					array(
						'version'                 => 'latest',
						'region'                  => $this->region,
						'endpoint'                => $this->endpoint,
						'use_path_style_endpoint' => false,
						'credentials'             => array(
							'key'    => $access_key,
							'secret' => $secret_key,
						),
					)
				);
			} catch ( Exception $e ) {
				error_log( 'Urbana: Failed to initialize Digital Ocean Spaces client: ' . $e->getMessage() );
			}
		}
	}

	public function is_configured() {
		return ! empty( $this->s3_client ) && ! empty( $this->bucket_name );
	}

	public function is_sdk_available() {
		return $this->sdk_available;
	}


	public function test_connection() {
		if ( ! $this->sdk_available ) {
			return array(
				'success' => false,
				'message' => 'AWS SDK not available. Please install composer dependencies.',
			);
		}

		if ( ! $this->is_configured() ) {
			return array(
				'success' => false,
				'message' => 'Digital Ocean Spaces not configured',
			);
		}

		try {
			$result = $this->s3_client->headBucket(
				array(
					'Bucket' => $this->bucket_name,
				)
			);

			return array(
				'success' => true,
				'message' => 'Connection successful',
			);
		} catch ( AwsException $e ) {
			return array(
				'success' => false,
				'message' => 'Connection failed: ' . $e->getMessage(),
			);
		}
	}

	public function list_objects( $prefix = '' ) {
		if ( ! $this->sdk_available ) {
			return array(
				'success' => false,
				'message' => 'AWS SDK not available',
				'objects' => array(),
			);
		}
		if ( ! $this->is_configured() ) {
			return array(
				'success' => false,
				'message' => 'Digital Ocean Spaces not configured',
				'objects' => array(),
			);
		}

		try {
			$objects = array();
			$params  = array(
				'Bucket' => $this->bucket_name,
			);

			if ( ! empty( $prefix ) ) {
				$params['Prefix'] = $prefix;
			}

			$paginator = $this->s3_client->getPaginator( 'ListObjects', $params );

			foreach ( $paginator as $result ) {
				if ( isset( $result['Contents'] ) ) {
					foreach ( $result['Contents'] as $object ) {
						$objects[] = array(
							'key'           => $object['Key'],
							'size'          => $object['Size'],
							'last_modified' => $object['LastModified']->format( 'Y-m-d H:i:s' ),
							'url'           => $this->get_object_url( $object['Key'] ),
						);
					}
				}
			}

			return array(
				'success' => true,
				'message' => sprintf( 'Found %d objects', count( $objects ) ),
				'objects' => $objects,
			);
		} catch ( AwsException $e ) {
			return array(
				'success' => false,
				'message' => 'Failed to list objects: ' . $e->getMessage(),
				'objects' => array(),
			);
		}
	}

	public function get_object_url( $key ) {
		if ( ! $this->is_configured() ) {
			return '';
		}

		return "https://{$this->bucket_name}.{$this->region}.digitaloceanspaces.com/{$key}";
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

				if ( in_array( $type, array( 'images', 'downloads' ) ) ) {
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
			'sdk_available' => $this->sdk_available,
		);
	}
}
