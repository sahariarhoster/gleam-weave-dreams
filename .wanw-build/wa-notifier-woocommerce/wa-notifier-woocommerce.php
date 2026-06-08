<?php
/**
 * Plugin Name: WA Notifier for WooCommerce
 * Description: Send WhatsApp notifications to customers and admins on WooCommerce order events using the WA Notifier panel.
 * Version: 1.0.5
 * Author: WA Notifier
 * Requires Plugins: woocommerce
 * Text Domain: wa-notifier-woo
 */

if (!defined('ABSPATH')) exit;

define('WANW_VERSION', '1.0.5');
define('WANW_PATH', plugin_dir_path(__FILE__));
define('WANW_URL', plugin_dir_url(__FILE__));
define('WANW_DEFAULT_API_BASE', 'https://project--a0a9916d-cf1e-4153-b116-96114e96c2cc.lovable.app');

require_once WANW_PATH . 'includes/class-settings.php';
require_once WANW_PATH . 'includes/class-api-client.php';
require_once WANW_PATH . 'includes/class-shortcodes.php';
require_once WANW_PATH . 'includes/class-wizard.php';
require_once WANW_PATH . 'includes/class-woocommerce-hooks.php';
require_once WANW_PATH . 'includes/class-updater.php';

register_activation_hook(__FILE__, function () {
    if (!get_option('wanw_setup_complete')) {
        add_option('wanw_redirect_to_wizard', 1);
    }
});

add_action('admin_init', function () {
    if (get_option('wanw_redirect_to_wizard')) {
        delete_option('wanw_redirect_to_wizard');
        if (!isset($_GET['activate-multi'])) {
            wp_safe_redirect(admin_url('admin.php?page=wanw-wizard'));
            exit;
        }
    }
});

add_action('admin_menu', function () {
    add_menu_page(
        'WA Notifier', 'WA Notifier', 'manage_options', 'wanw-dashboard',
        function () { include WANW_PATH . 'admin/dashboard.php'; },
        'dashicons-whatsapp', 56
    );
    add_submenu_page('wanw-dashboard', 'Dashboard', 'Dashboard', 'manage_options', 'wanw-dashboard',
        function () { include WANW_PATH . 'admin/dashboard.php'; });
    add_submenu_page('wanw-dashboard', 'WooCommerce Config', 'WooCommerce Config', 'manage_options', 'wanw-woo',
        function () { include WANW_PATH . 'admin/woocommerce-config.php'; });
    add_submenu_page('wanw-dashboard', 'Admin Config', 'Admin Config', 'manage_options', 'wanw-admin',
        function () { include WANW_PATH . 'admin/admin-config.php'; });
    add_submenu_page('wanw-dashboard', 'Test', 'Test', 'manage_options', 'wanw-test',
        function () { include WANW_PATH . 'admin/test.php'; });
    add_submenu_page('wanw-dashboard', 'License', 'License', 'manage_options', 'wanw-license',
        function () { include WANW_PATH . 'admin/change-license.php'; });
    add_submenu_page(null, 'Setup Wizard', 'Setup Wizard', 'manage_options', 'wanw-wizard',
        function () { include WANW_PATH . 'includes/wizard-render.php'; });
});

add_action('admin_enqueue_scripts', function ($hook) {
    if (strpos($hook, 'wanw') !== false || strpos($hook, 'wa-notifier') !== false) {
        wp_enqueue_style('wanw-admin', WANW_URL . 'assets/css/admin.css', [], WANW_VERSION);
    }
});

WANW_Woo_Hooks::init();
WANW_Updater::init();
