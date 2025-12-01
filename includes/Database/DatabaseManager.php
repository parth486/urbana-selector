<?php
namespace Urbana\Database;

class DatabaseManager {

	private $wpdb;
	private $table_prefix;

	public function __construct() {
		global $wpdb;
		$this->wpdb         = $wpdb;
		$this->table_prefix = $wpdb->prefix . 'urbana_';
	}

	public function create_tables() {
		$charset_collate = $this->wpdb->get_charset_collate();

		// Submissions table
		$submissions_table = $this->table_prefix . 'submissions';
		$sql               = "CREATE TABLE $submissions_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            submitted_at datetime DEFAULT CURRENT_TIMESTAMP,
            product_group varchar(100) NOT NULL,
            product_range varchar(100) NOT NULL,
            individual_product varchar(100) NOT NULL,
            options longtext DEFAULT NULL,
            contact_info longtext NOT NULL,
            status varchar(20) DEFAULT 'new',
            notes longtext DEFAULT NULL,
            priority varchar(10) DEFAULT 'medium',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY status (status),
            KEY priority (priority),
            KEY submitted_at (submitted_at)
        ) $charset_collate;";

		// Product data table
		$product_data_table = $this->table_prefix . 'product_data';
		$sql2               = "CREATE TABLE $product_data_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            data_key varchar(50) NOT NULL,
            data_value longtext NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY data_key (data_key)
        ) $charset_collate;";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
		dbDelta( $sql2 );

		// Insert default product data if not exists
		$this->insert_default_product_data();
	}

	private function insert_default_product_data() {
			$existing = $this->wpdb->get_var(
				$this->wpdb->prepare(
					"SELECT COUNT(*) FROM {$this->table_prefix}product_data WHERE data_key = %s",
					'stepper_form_data'
				)
			);

		if ( $existing == 0 ) {
			$default_data = array(
				'id'          => 1, // Add ID to the structure
				'stepperForm' => array(
					'steps' => array(
						array(
							'step'       => 1,
							'title'      => 'Select Product Group',
							'categories' => array( 'Shelter', 'Toilet', 'Bridge', 'Access', 'Seating', 'Lighting' ),
						),
						array(
							'step'   => 2,
							'title'  => 'Select Product Range',
							'ranges' => array(
								'Shelter' => array( 'Peninsula', 'Whyalla', 'Coastal', 'Urban', 'Heritage' ),
								'Toilet'  => array( 'EcoSan', 'Standard', 'Accessible', 'Premium', 'Compact' ),
							),
						),
						array(
							'step'     => 3,
							'title'    => 'Select Individual Product',
							'products' => array(),
						),
						array(
							'step'           => 4,
							'title'          => 'View Product Content',
							'productDetails' => array(),
						),
						array(
							'step'    => 5,
							'title'   => 'Configure Options',
							'options' => array(),
						),
						array(
							'step'   => 6,
							'title'  => 'Contact Information',
							'fields' => array(
								array(
									'name'     => 'fullName',
									'label'    => 'Full Name',
									'type'     => 'text',
									'required' => true,
								),
								array(
									'name'     => 'email',
									'label'    => 'Email Address',
									'type'     => 'email',
									'required' => true,
								),
								array(
									'name'     => 'phone',
									'label'    => 'Phone Number',
									'type'     => 'tel',
									'required' => false,
								),
								array(
									'name'     => 'company',
									'label'    => 'Company/Organization',
									'type'     => 'text',
									'required' => false,
								),
								array(
									'name'     => 'message',
									'label'    => 'Additional Notes',
									'type'     => 'textarea',
									'required' => false,
								),
							),
						),
					),
				),
			);

			$this->wpdb->insert(
				$this->table_prefix . 'product_data',
				array(
					'data_key'   => 'stepper_form_data',
					'data_value' => json_encode( $default_data ),
				),
				array( '%s', '%s' )
			);
		}
	}

	public function get_submissions( $args = array() ) {
		$defaults = array(
			'status'   => '',
			'priority' => '',
			'limit'    => 25,
			'offset'   => 0,
			'orderby'  => 'submitted_at',
			'order'    => 'DESC',
		);

		$args = wp_parse_args( $args, $defaults );

		$where_conditions = array( '1=1' );
		$where_values     = array();

		if ( ! empty( $args['status'] ) ) {
			$where_conditions[] = 'status = %s';
			$where_values[]     = $args['status'];
		}

		if ( ! empty( $args['priority'] ) ) {
			$where_conditions[] = 'priority = %s';
			$where_values[]     = $args['priority'];
		}

		$where_clause = implode( ' AND ', $where_conditions );

		$sql = $this->wpdb->prepare(
			"SELECT * FROM {$this->table_prefix}submissions 
             WHERE $where_clause 
             ORDER BY {$args['orderby']} {$args['order']} 
             LIMIT %d OFFSET %d",
			array_merge( $where_values, array( $args['limit'], $args['offset'] ) )
		);

		return $this->wpdb->get_results( $sql, ARRAY_A );
	}

	public function insert_submission( $data ) {
		return $this->wpdb->insert(
			$this->table_prefix . 'submissions',
			array(
				'product_group'      => $data['product_group'],
				'product_range'      => $data['product_range'],
				'individual_product' => $data['individual_product'],
				'options'            => json_encode( $data['options'] ),
				'contact_info'       => json_encode( $data['contact_info'] ),
				'status'             => 'new',
				'priority'           => 'medium',
			),
			array( '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
		);
	}

	public function update_submission( $id, $data ) {
		return $this->wpdb->update(
			$this->table_prefix . 'submissions',
			$data,
			array( 'id' => $id ),
			null,
			array( '%d' )
		);
	}

	public function delete_submission( $id ) {
		return $this->wpdb->delete(
			$this->table_prefix . 'submissions',
			array( 'id' => $id ),
			array( '%d' )
		);
	}

	public function get_product_data_first_id( $key = 'stepper_form_data' ) {
		$result = $this->wpdb->get_var(
			$this->wpdb->prepare(
				"SELECT id FROM {$this->table_prefix}product_data WHERE data_key = %s ORDER BY id ASC LIMIT 1",
				$key
			)
		);

		return $result ? absint( $result ) : null;
	}

	public function get_product_data( $id = 1, $key = 'stepper_form_data' ) {

		if ( 'stepper_form_data' !== $key ) {
			$result = $this->wpdb->get_var(
				$this->wpdb->prepare(
					"SELECT data_value FROM {$this->table_prefix}product_data WHERE data_key = %s",
					$key
				)
			);
			return $result ? json_decode( $result, true ) : null;
		}
		if ( ! $id || ! is_numeric( $id ) ) {
			$result = $this->wpdb->get_var(
				$this->wpdb->prepare(
					"SELECT data_value FROM {$this->table_prefix}product_data WHERE data_key = %s",
					$key
				)
			);
		} else {
			$result = $this->wpdb->get_var(
				$this->wpdb->prepare(
					"SELECT data_value FROM {$this->table_prefix}product_data WHERE id = %d AND data_key = %s",
					absint( $id ),
					$key
				)
			);
		}

		return $result ? json_decode( $result, true ) : null;
	}

	public function update_product_data( $key, $data ) {
		// Check if record exists
		$existing = $this->wpdb->get_var(
			$this->wpdb->prepare(
				"SELECT id FROM {$this->table_prefix}product_data WHERE data_key = %s",
				$key
			)
		);

		$result = false;

		if ( $existing ) {
			// Update existing record
			$result = $this->wpdb->update(
				$this->table_prefix . 'product_data',
				array(
					'data_value' => json_encode( $data ),
				),
				array( 'data_key' => $key ),
				array( '%s' ),
				array( '%s' )
			);

			// Set the insert_id to the existing ID for consistency
			$this->wpdb->insert_id = $existing;
		} else {
			// Insert new record
			$result = $this->wpdb->insert(
				$this->table_prefix . 'product_data',
				array(
					'data_key'   => $key,
					'data_value' => json_encode( $data ),
				),
				array( '%s', '%s' )
			);
		}

		// Trigger reverse sync action if the update was successful
		if ( $result !== false ) {
			do_action( 'urbana_product_data_updated', $key, $data );
		}

		return $result;
	}

	public function get_last_insert_id() {
		return $this->wpdb->insert_id;
	}
}
