<?php
namespace Urbana\Frontend;

class FrontendInit {

	public function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_public_scripts' ) );
		// add_action( 'wp_enqueue_scripts', array( $this, 'register_public_scripts' ) );
		add_shortcode( 'urbana_product_stepper', array( $this, 'render_stepper_shortcode' ) );
		add_action( 'wp_footer', array( $this, 'add_stepper_root_div' ) );
	}

	public function enqueue_public_scripts() {
		// Only enqueue on pages that have the shortcode or a forced debug query parameter
		global $post;
		// Force via URL: ?urbana_force=1 for debugging
		if ( ( isset( $_GET['urbana_force'] ) && $_GET['urbana_force'] == '1' ) || ( is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'urbana_product_stepper' ) ) ) {
			$this->load_stepper_assets( 1 );
		}
	}

	private function load_stepper_assets( $id ) {
		$asset_file = URBANA_PLUGIN_PATH . 'assets/dist/';

		if ( file_exists( $asset_file . 'stepper-app.js' ) ) {
			wp_enqueue_script(
				'urbana-stepper-app',
				URBANA_PLUGIN_URL . 'assets/dist/stepper-app.js',
				array( 'wp-element' ),
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

				// Add detailed product content (step 4) from builder 'products' if available so the front-end gets per-product details (including faqs)
				if ( isset( $builder_data['products'] ) && is_array( $builder_data['products'] ) ) {
					if ( ! isset( $product_data['stepperForm']['steps'][3]['productDetails'] ) ) {
						$product_data['stepperForm']['steps'][3]['productDetails'] = array();
					}

					foreach ( $builder_data['products'] as $p ) {
						// Ensure required keys exist on product in builder data
						if ( isset( $p['code'] ) ) {
							$code = $p['code'];

							// Map builder product fields into productDetails structure and include faqs if present
							$product_data['stepperForm']['steps'][3]['productDetails'][ $code ] = array(
								'name'        => $p['name'] ?? $code,
								'overview'    => $p['overview'] ?? '',
								'description' => $p['description'] ?? '',
								'specifications' => $p['specifications'] ?? array(),
								'imageGallery'   => $p['imageGallery'] ?? array(),
								'files'          => $p['files'] ?? array(),
								'faqs'           => $p['faqs'] ?? array(),
							);
						}
					}
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
		// If the page is forced via query param, add a visible root node for debugging
		if ( isset( $_GET['urbana_force'] ) && $_GET['urbana_force'] == '1' ) {
			echo '<div id="urbana-stepper-root" class="urbana-stepper-container" data-theme="default" style="display:block;padding:0;margin:0;"></div>';
			// Small inline log so we can verify enqueue works even without the shortcode
			echo "<script>console.warn('[Urbana] stepper root injected via urbana_force');</script>";
			// Diagnostic handlers: capture runtime errors and promise rejections, show overlay, and provide a simple click fallback
			echo "<script>(function(){\n    window.__urbana_diag = window.__urbana_diag || {errors:[]};\n    function showOverlay(msg){\n        try{\n            var root = document.getElementById('urbana-stepper-root');\n            if(!root) return;\n            var el = document.getElementById('urbana-err-overlay');\n            if(!el){\n                el = document.createElement('div');\n                el.id = 'urbana-err-overlay';\n                el.style.position = 'fixed';\n                el.style.right = '12px';\n                el.style.bottom = '12px';\n                el.style.zIndex = '2147483647';\n                el.style.background = 'rgba(220,38,38,0.95)';\n                el.style.color = 'white';\n                el.style.padding = '8px 10px';\n                el.style.borderRadius = '6px';\n                el.style.fontSize = '12px';\n                el.style.maxWidth = '420px';\n                el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';\n                document.body.appendChild(el);\n            }\n            el.textContent = msg;\n            el.style.display = 'block';\n        }catch(e){}\n    }\n    window.addEventListener('error', function(e){\n        var msg = '[Urbana diag] uncaught error: ' + (e && (e.error && e.error.message ? e.error.message : e.message));\n        console.error(msg, e.error || e);\n        window.__urbana_diag.errors.push({type:'error', message: msg, stack: e && e.error && e.error.stack?e.error.stack: null});\n        showOverlay(msg);\n    }, true);\n    window.addEventListener('unhandledrejection', function(e){\n        var msg = '[Urbana diag] unhandledrejection: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason));\n        console.error(msg, e.reason);\n        window.__urbana_diag.errors.push({type:'unhandledrejection', message: msg, stack: e.reason && e.reason.stack ? e.reason.stack : null});\n        showOverlay(msg);\n    }, true);\n    console.log('[Urbana diag] handler installed');\n})();</script>";
			// Fallback: if the stepper bundle does not load, show an in-page lightbox for clicked gallery images
			echo <<<'JS'
			<script>
			(function(){
			  if(window.urbanaStepFallback) return; window.urbanaStepFallback = true;
			  function createFallbackLightbox(){
			    if(document.getElementById('urbana-fallback-lightbox')) return;
			    var overlay = document.createElement('div');
			    overlay.id = 'urbana-fallback-lightbox';
			    overlay.style.position = 'fixed';
			    overlay.style.inset = '0';
			    overlay.style.zIndex = '2147483647';
			    overlay.style.display = 'none';
			    overlay.style.alignItems = 'center';
			    overlay.style.justifyContent = 'center';
			    overlay.style.background = 'rgba(0,0,0,0.8)';
			    overlay.innerHTML = '<div id="urbana-fallback-inner" style="position:relative;max-width:95%;max-height:95%">' + '<button id="urbana-fallback-close" aria-label="Close" style="position:absolute;right:-40px;top:0;background:transparent;color:white;border:0;font-size:32px;cursor:pointer">✕</button>' + '<img id="urbana-fallback-image" style="max-width:100%;max-height:85vh;display:block;margin:0 auto" />' + '<div id="urbana-fallback-controls" style="position:absolute;left:0;right:0;top:50%;display:flex;justify-content:space-between;pointer-events:none">' + '<button id="urbana-fallback-prev" style="pointer-events:auto;background:transparent;border:0;color:white;font-size:48px">‹</button>' + '<button id="urbana-fallback-next" style="pointer-events:auto;background:transparent;border:0;color:white;font-size:48px">›</button>' + '</div></div>';
			    document.body.appendChild(overlay);
			    var img = overlay.querySelector('#urbana-fallback-image');
			    var closeBtn = overlay.querySelector('#urbana-fallback-close');
			    var prevBtn = overlay.querySelector('#urbana-fallback-prev');
			    var nextBtn = overlay.querySelector('#urbana-fallback-next');
			    function close(){ overlay.style.display = 'none'; window.removeEventListener('keydown', overlay._onKey); }
			    prevBtn.addEventListener('click', function(){ navigate(-1); });
			    nextBtn.addEventListener('click', function(){ navigate(1); });
			    closeBtn.addEventListener('click', close);
			    function navigate(dir){ try{ var imgs = JSON.parse(overlay.dataset.imgs || '[]'); var idx = parseInt(overlay.dataset.idx || '0', 10); idx = Math.max(0, Math.min(imgs.length - 1, idx + dir)); overlay.dataset.idx = idx; img.src = imgs[idx] || img.src; }catch(e){} }
			    overlay.close = close;
			    overlay.navigate = navigate;
			  }

			  function showFallbackLightbox(src, index){
			    createFallbackLightbox();
			    var overlay = document.getElementById('urbana-fallback-lightbox');
			    var thumbs = Array.from(document.querySelectorAll('[data-gallery-index] img')).map(function(i){ return i.src; });
			    if(!thumbs.length && src) thumbs = [src];
			    overlay.dataset.imgs = JSON.stringify(thumbs);
			    overlay.dataset.idx = (typeof index === 'number') ? index : Math.max(0, thumbs.indexOf(src));
			    overlay.querySelector('#urbana-fallback-image').src = src;
			    overlay.style.display = 'flex';
			    overlay._onKey = function(e){ if(e.key === 'Escape') overlay.close(); if(e.key === 'ArrowLeft') overlay.navigate(-1); if(e.key === 'ArrowRight') overlay.navigate(1); };
			    window.addEventListener('keydown', overlay._onKey);
			  }

			  function tryOpenAt(x,y){
			    try{
			      if(window.urbanaStepperLoaded) return false;
			      var el = document.elementFromPoint(x,y);
			      console.log('[Urbana diag] pointer at', x, y, 'top element', el && el.tagName, 'gallery-index', el && el.getAttribute && el.getAttribute('data-gallery-index'));
			      while(el && el !== document.body){
			        if(el.getAttribute && el.getAttribute('data-gallery-index') != null){
			          var img = el.querySelector && el.querySelector('img');
			          var src = img && img.src ? img.src : null;
			          if(!src){ var anc = el.querySelector('img'); if(anc && anc.src) src = anc.src; }
			          if(src){ var idx = parseInt(el.getAttribute('data-gallery-index') || '0', 10); console.log('[Urbana diag] fallback showing lightbox', src, 'index', idx); showFallbackLightbox(src, idx); return true; }
			          return false;
			        }
			        el = el.parentElement;
			      }
			      var thumbs = document.querySelectorAll('[data-gallery-index]');
			      for(var i=0;i<thumbs.length;i++){
			        var t = thumbs[i];
			        var r = t.getBoundingClientRect();
			        if(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom){
			          var img = t.querySelector('img');
			          if(img && img.src){ var idx = parseInt(t.getAttribute('data-gallery-index')||'0',10); showFallbackLightbox(img.src, idx); console.log('[Urbana diag] fallback showing lightbox via bounding', img.src); return true; }
			        }
			      }
			    }catch(err){
			      console.error('[Urbana diag] fallback click error', err);
			    }
			    return false;
			  }

			  document.addEventListener('pointerdown', function(e){ tryOpenAt(e.clientX, e.clientY); }, true);
			  document.addEventListener('click', function(e){ tryOpenAt(e.clientX, e.clientY); }, true);
			  console.log('[Urbana diag] fallback click handler installed (pointerdown+click+lightbox)');
			})();
			</script>
			JS;
			// Watch for the module failing to set a loaded flag and surface a friendly diagnostic after a short delay
			echo "<script>(function(){ setTimeout(function(){ if(!window.urbanaStepperLoaded){ console.warn('[Urbana diag] stepper did not set window.urbanaStepperLoaded within 3s'); var el = document.getElementById('urbana-err-overlay'); if(el){ el.textContent = el.textContent ? el.textContent + ' | stepper not loaded' : 'Stepper not loaded'; } else { console.warn('[Urbana diag] no overlay present to show stepper load status'); } } else { console.log('[Urbana diag] stepperLoaded flag present'); } }, 3000); })();</script>";
			// Also include the module script directly in the footer (debug fallback)
			$script_url = URBANA_PLUGIN_URL . 'assets/dist/stepper-app.js';
			// Ensure wp.element is available when injecting the debug module tag
			wp_enqueue_script( 'wp-element' );
			// Add a plain module script tag so the browser executes the bundle immediately
			echo "<script type=\"module\" src=\"{$script_url}\"></script>";
			// Also add diagnostic dynamic-check to report HEAD status and attempt dynamic import if needed
			echo "<script type=\"module\">(async function(){ try{ console.log('[Urbana] debug: checking stepper script at {$script_url}'); const res = await fetch('{$script_url}', { method: 'HEAD' }); console.log('[Urbana] debug: HEAD', res.status, res.statusText); if (!window.urbanaStepperLoaded) { try { await import('{$script_url}'); console.log('[Urbana] debug: dynamic import succeeded'); } catch (e) { console.error('[Urbana] debug: dynamic import failed', e); } } else { console.log('[Urbana] debug: stepper already loaded'); } } catch (e) { console.error('[Urbana] debug: fetch/import diagnostics failed', e); } })()</script>";
			$diag_js = <<<'JSDIAG'
(async function(){
    try{
        console.log("[Urbana diag] attaching script element diagnostics");
        var scriptUrl = SCRIPT_URL_PLACEHOLDER;
        var existing = document.querySelector("script[src=\"" + scriptUrl + "\"]");
        if(!existing){
            var s = document.createElement("script");
            s.type = "module";
            s.src = scriptUrl;
            s.onload = function(){ console.log("[Urbana diag] module script onload"); };
            s.onerror = function(ev){ console.error("[Urbana diag] module script onerror", ev); };
            document.body.appendChild(s);
        } else {
            console.log("[Urbana diag] script element already present");
            existing.addEventListener("load", function(){ console.log("[Urbana diag] existing script load event"); });
            existing.addEventListener("error", function(e){ console.error("[Urbana diag] existing script error", e); });
        }

        try{
            const txt = await (await fetch(scriptUrl)).text();
            try{
                const baseDir = new URL('.', scriptUrl).toString();
                let rewritten = txt;
                // Rewrite relative imports (./ or ../) to absolute URLs based on script location
                rewritten = rewritten.replace(/(from\s*[\"\'])([.]{1,2}\/[^\"\'\n]+)([\"\'])/g, function(_, p1, p2, p3){ return p1 + new URL(p2, baseDir).toString() + p3; });
                rewritten = rewritten.replace(/(import\(\s*[\"\'])([.]{1,2}\/[^\"\'\n]+)([\"\']\s*\))/g, function(_, p1, p2, p3){ return p1 + new URL(p2, baseDir).toString() + p3; });
                rewritten = rewritten.replace(/(import\s*[\"\'])([.]{1,2}\/[^\"\'\n]+)([\"\'])/g, function(_, p1, p2, p3){ return p1 + new URL(p2, baseDir).toString() + p3; });
                rewritten = rewritten.replace(/(export\s+[\s\S]*?from\s*[\"\'])([.]{1,2}\/[^\"\'\n]+)([\"\'])/g, function(_, p1, p2, p3){ return p1 + new URL(p2, baseDir).toString() + p3; });
                const blob = new Blob([rewritten], { type: "application/javascript" });
                const url = URL.createObjectURL(blob);
                try{ await import(url); console.log("[Urbana diag] dynamic import via blob succeeded"); } catch(e){ console.error("[Urbana diag] dynamic import via blob failed", e); }
            } catch(e){ console.error("[Urbana diag] blob creation/import error", e); }
        } catch(e){ console.error("[Urbana diag] fetch for blob failed", e); }
    } catch(e){ console.error("[Urbana diag] script injection diagnostics failed", e); }
})();
JSDIAG;
	echo "<script>console.log('[Urbana] debug: stepper diagnostics simplified');</script>";
			// Deep diagnostics: inspect existing script tag attributes and fetch a snippet of the bundle for inspection
				echo '<script>(function(){ try{ var scriptUrl = ' . json_encode( $script_url ) . '; var matches = Array.from(document.querySelectorAll("script")).filter(function(s){ return s.src && s.src.indexOf(scriptUrl) !== -1; }); console.log("[Urbana diag] matching script elements", matches.length, matches.map(function(s){return {src:s.src,type:s.type,async:s.async,defer:s.defer,nomodule:s.noModule,integrity:s.integrity||null,crossorigin:s.crossOrigin||null};})); matches.forEach(function(s){ s.addEventListener("load", function(){ console.log("[Urbana diag] matched script onload", s.src); }); s.addEventListener("error", function(e){ console.error("[Urbana diag] matched script error", e, s.src); }); }); try{ var inlineModule = document.createElement("script"); inlineModule.type = "module"; inlineModule.text = "console.log(\"[Urbana diag] inline module executed\");"; document.body.appendChild(inlineModule); }catch(e){ console.error("[Urbana diag] inline module injection failed", e); } console.log("[Urbana diag] root present:", !!document.getElementById(\'urbana-stepper-root\'), "urbanaStepperLoaded:", !!window.urbanaStepperLoaded); }catch(e){ console.error("[Urbana diag] deep diagnostics runtime error", e); } })();</script>';
            return;
		}

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
