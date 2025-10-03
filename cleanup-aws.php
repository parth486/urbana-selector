<?php
< ? php
/**
 * Cleanup unnecessary AWS SDK files to reduce size
 */

$vendorDir      = __DIR__ . '/vendor/aws/aws-sdk-php/src/';
$servicesToKeep = array( 'S3' );

if ( is_dir( $vendorDir ) ) {
	$iterator = new RecursiveIteratorIterator(
		new RecursiveDirectoryIterator( $vendorDir )
	);

	foreach ( $iterator as $file ) {
		if ( $file->isDir() ) {
			$dirname = basename( $file->getPathname() );
			if ( ! in_array( $dirname, $servicesToKeep ) &&
				! in_array( $dirname, array( '.', '..', 'Exception', 'Api' ) ) &&
				strpos( $file->getPathname(), '/S3/' ) === false ) {
				// Remove unused AWS services
				if ( is_dir( $file->getPathname() ) ) {
					exec( 'rm -rf ' . escapeshellarg( $file->getPathname() ) );
				}
			}
		}
	}
}

echo "AWS SDK cleanup completed\n";
