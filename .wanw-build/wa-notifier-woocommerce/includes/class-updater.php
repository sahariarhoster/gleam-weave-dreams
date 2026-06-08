<?php
if (!defined('ABSPATH')) exit;

/**
 * Self-updater: queries the WA Notifier panel for new releases using the
 * stored license key. WordPress will surface the update on Plugins screen.
 */
class WANW_Updater {
    const TRANSIENT = 'wanw_remote_release';

    public static function init() {
        add_filter('pre_set_site_transient_update_plugins', [__CLASS__, 'inject_update']);
        add_filter('plugins_api', [__CLASS__, 'plugins_api'], 10, 3);
        add_action('upgrader_process_complete', [__CLASS__, 'clear_cache'], 10, 2);
        add_action('admin_post_wanw_check_update', [__CLASS__, 'manual_check']);
    }

    public static function plugin_basename() {
        return plugin_basename(WANW_PATH . 'wa-notifier-woocommerce.php');
    }

    public static function plugin_slug() {
        return 'wa-notifier-woocommerce';
    }

    public static function clear_cache() {
        delete_transient(self::TRANSIENT);
    }

    public static function update_url() {
        return wp_nonce_url(
            self_admin_url('update.php?action=upgrade-plugin&plugin=' . rawurlencode(self::plugin_basename())),
            'upgrade-plugin_' . self::plugin_basename()
        );
    }

    public static function manual_check() {
        if (!current_user_can('update_plugins')) wp_die('Permission denied.');
        check_admin_referer('wanw_check_update');
        self::clear_cache();
        delete_site_transient('update_plugins');
        self::fetch_remote(true);
        wp_update_plugins();
        wp_safe_redirect(admin_url('admin.php?page=wanw-dashboard&wanw_update_checked=1'));
        exit;
    }

    public static function fetch_remote($force = false) {
        if (!$force) {
            $cached = get_transient(self::TRANSIENT);
            if ($cached) return $cached;
        }
        $license = WANW_Settings::license();
        if (!$license) return null;
        $res = wp_remote_post(WANW_Settings::api_base() . '/api/public/plugin/update-check', [
            'headers' => ['Content-Type' => 'application/json'],
            'timeout' => 15,
            'body'    => wp_json_encode([
                'license_key'     => $license,
                'current_version' => WANW_VERSION,
            ]),
        ]);
        if (is_wp_error($res)) return null;
        $code = wp_remote_retrieve_response_code($res);
        if ($code !== 200) return null;
        $body = json_decode(wp_remote_retrieve_body($res), true);
        if (!is_array($body) || empty($body['version'])) return null;
        set_transient(self::TRANSIENT, $body, 6 * HOUR_IN_SECONDS);
        return $body;
    }

    public static function inject_update($transient) {
        if (empty($transient) || !is_object($transient)) return $transient;
        $remote = self::fetch_remote();
        if (!$remote) return $transient;
        if (version_compare(WANW_VERSION, $remote['version'], '<')) {
            $basename = self::plugin_basename();
            $obj = (object) [
                'id'            => $basename,
                'slug'          => self::plugin_slug(),
                'plugin'        => $basename,
                'new_version'   => $remote['version'],
                'url'           => WANW_Settings::api_base(),
                'package'       => $remote['download_url'],
                'tested'        => $remote['tested'] ?? '',
                'requires'      => $remote['requires'] ?? '',
                'requires_php'  => $remote['requires_php'] ?? '',
                'icons'         => [],
                'banners'       => [],
                'compatibility' => new stdClass(),
            ];
            if (!isset($transient->response) || !is_array($transient->response)) {
                $transient->response = [];
            }
            $transient->response[$basename] = $obj;
        }
        return $transient;
    }

    public static function plugins_api($result, $action, $args) {
        if ($action !== 'plugin_information') return $result;
        if (empty($args->slug) || $args->slug !== self::plugin_slug()) return $result;
        $remote = self::fetch_remote();
        if (!$remote) return $result;
        return (object) [
            'name'          => $remote['name'] ?? 'WA Notifier for WooCommerce',
            'slug'          => self::plugin_slug(),
            'version'       => $remote['version'],
            'tested'        => $remote['tested'] ?? '',
            'requires'      => $remote['requires'] ?? '',
            'requires_php'  => $remote['requires_php'] ?? '',
            'download_link' => $remote['download_url'],
            'sections'      => [
                'description' => 'Send WhatsApp notifications to customers and admins on WooCommerce order events.',
                'changelog'   => nl2br(esc_html($remote['changelog'] ?? '')),
            ],
        ];
    }
}
