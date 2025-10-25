<?php
namespace Urbana\Frontend;

class FrontendInit {

	public function __construct() {
		// add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_public_scripts' ) );
		// add_action( 'wp_enqueue_scripts', array( $this, 'register_public_scripts' ) );
		add_shortcode( 'urbana_product_stepper', array( $this, 'render_stepper_shortcode' ) );
		add_action( 'wp_footer', array( $this, 'add_stepper_root_div' ) );
	}

	public function enqueue_public_scripts() {
		// Only enqueue on pages that have the shortcode or specific conditions
		global $post;
		if ( is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'urbana_product_stepper' ) ) {
			$this->load_stepper_assets( 1 );
		}
	}

	private function load_stepper_assets( $id ) {
		$asset_file = URBANA_PLUGIN_PATH . 'assets/dist/';

		if ( file_exists( $asset_file . 'stepper-app.js' ) ) {
			wp_enqueue_script(
				'urbana-stepper-app',
				URBANA_PLUGIN_URL . 'assets/dist/stepper-app.js',
				array(),
				URBANA_VERSION,
				true
			);

			// Add module type attribute
			add_filter(
				'script_loader_tag',
				function ( $tag, $handle ) {
					if ( 'urbana-stepper-app' === $handle ) {
						return str_replace( '<script', '<script type="module"', $tag );
					}
					return $tag;
				},
				10,
				2
			);

			wp_enqueue_style(
				'urbana-stepper-app',
				URBANA_PLUGIN_URL . 'assets/dist/stepper-app.css',
				array(),
				URBANA_VERSION
			);

			// Get product data and data builder information from database
			$db_manager   = new \Urbana\Database\DatabaseManager();
			$product_data = $db_manager->get_product_data( 'stepper_form_data' );

			// Get data builder information for detailed product data
			$builder_key  = 'stepper_data_builder_' . $id;
			$builder_data = $db_manager->get_product_data( null, $builder_key );

			if ( ! $product_data ) {
				// Fallback to default data file if database is empty
				$product_data = $this->get_default_product_data();
			}

			// Enhance product data with builder information
			if ( $builder_data && isset( $builder_data['productGroups'] ) ) {
				// Add product groups data to the stepper form data
				if ( ! isset( $product_data['stepperForm']['steps'][0]['productGroups'] ) ) {
					$product_data['stepperForm']['steps'][0]['productGroups'] = $builder_data['productGroups'];
				}

				// Add product ranges data
				if ( ! isset( $product_data['stepperForm']['steps'][1]['productRanges'] ) ) {
					$product_data['stepperForm']['steps'][1]['productRanges'] = $builder_data['productRanges'];
					$product_data['stepperForm']['steps'][1]['relationships'] = $builder_data['relationships'];
				}

				// Add products data
				if ( ! isset( $product_data['stepperForm']['steps'][2]['productsData'] ) ) {
					$product_data['stepperForm']['steps'][2]['productsData']  = $builder_data['products'];
					$product_data['stepperForm']['steps'][2]['relationships'] = $builder_data['relationships'];
				}
			}

			// Localize script for API calls and data
			wp_localize_script(
				'urbana-stepper-app',
				'urbanaPublic',
				array(
					'apiUrl'      => rest_url( 'urbana/v1/' ),
					'nonce'       => wp_create_nonce( 'wp_rest' ),
					'productData' => $product_data,
					'stepperId'   => $id,
					'ajaxUrl'     => admin_url( 'admin-ajax.php' ),
				)
			);
		}
	}

	public function render_stepper_shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'theme'           => 'default',
				'container_class' => '',
				'id'              => '1',
			),
			$atts
		);

		// Enqueue assets if not already done
		$this->load_stepper_assets( $atts['id'] );

		$container_class = ! empty( $atts['container_class'] ) ? ' ' . esc_attr( $atts['container_class'] ) : '';

		return '<div id="urbana-stepper-root" class="urbana-stepper-container' . $container_class . '" data-theme="' . esc_attr( $atts['theme'] ) . '"></div>';
	}

	public function add_stepper_root_div() {
		// Add root div to footer if shortcode is present but div wasn't rendered
		global $post;
		if ( is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'urbana_product_stepper' ) ) {
			echo '<div id="urbana-stepper-fallback-root" style="display:none;"></div>';
		}
	}

	private function get_default_product_data() {
		// Return basic default data structure
		return array(
			'id'          => 1,
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
							'Shelter'  => array( 'Peninsula', 'Whyalla', 'Coastal', 'Urban', 'Heritage' ),
							'Toilet'   => array( 'EcoSan', 'Standard', 'Accessible', 'Premium', 'Compact' ),
							'Bridge'   => array( 'Small Span', 'Large Span', 'Pedestrian', 'Decorative', 'Heavy Duty' ),
							'Access'   => array( 'Ramp', 'Staircase', 'Pathway', 'Boardwalk', 'Platform' ),
							'Seating'  => array( 'Bench', 'Table Setting', 'Lounge', 'Stadium', 'Custom' ),
							'Lighting' => array( 'Solar', 'Mains Powered', 'Decorative', 'Security', 'Pathway' ),
						),
					),
					array(
						'step'     => 3,
						'title'    => 'Select Individual Product',
						'products' => array(
							'Peninsula' => array( 'K301', 'K302', 'K308', 'K310', 'K315' ),
							'Whyalla'   => array( 'W101', 'W102', 'W105', 'W110', 'W120' ),
						),
					),
					array(
						'step'           => 4,
						'title'          => 'View Product Content',
						'productDetails' => array(
							'K301' => array(
								'name'           => 'Peninsula K301',
								'overview'       => 'Compact shelter suitable for parks and gardens',
								'description'    => 'The Peninsula K301 is our most popular compact shelter.',
								'specifications' => array( 'Dimensions: 3.0m x 3.0m', 'Height: 2.5m' ),
								'imageGallery'   => array( 'shelter/1', 'shelter/2' ),
								'files'          => array( 'PDF Specification' => 'K301_Spec.pdf' ),
							),
						),
					),
					array(
						'step'    => 5,
						'title'   => 'Configure Options',
						'options' => array(
							'Post Material' => array( 'Pine', 'Hardwood', 'Steel' ),
							'Roof Option'   => array( 'Colorbond', 'Ultra Grade', 'Timber' ),
							'Screen'        => array( 'Rebated Front', 'None', 'Full Enclosure' ),
						),
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
	}
}
