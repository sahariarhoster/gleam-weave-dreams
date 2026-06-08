<?php
if (!defined('ABSPATH')) exit;

class WANW_Api {
    public static function url($path) {
        return WANW_Settings::api_base() . $path;
    }

    public static function post($path, $body) {
        $res = wp_remote_post(self::url($path), [
            'headers' => ['Content-Type' => 'application/json'],
            'body'    => wp_json_encode($body),
            'timeout' => 20,
        ]);
        return self::parse($res);
    }

    public static function get($path, $query = []) {
        $url = self::url($path);
        if (!empty($query)) $url = add_query_arg($query, $url);
        $res = wp_remote_get($url, ['timeout' => 20]);
        return self::parse($res);
    }

    private static function parse($res) {
        if (is_wp_error($res)) return ['ok' => false, 'error' => $res->get_error_message()];
        $code = wp_remote_retrieve_response_code($res);
        $body = json_decode(wp_remote_retrieve_body($res), true);
        if ($code >= 200 && $code < 300) return is_array($body) ? $body : ['ok' => true];
        return ['ok' => false, 'error' => $body['error'] ?? "HTTP $code"];
    }

    public static function activate($license_key, $site_url) {
        return self::post('/api/public/plugin/activate', [
            'license_key' => $license_key,
            'site_url'    => $site_url,
        ]);
    }
    public static function devices($license_key) {
        return self::get('/api/public/plugin/devices', ['license_key' => $license_key]);
    }
    public static function select_device($license_key, $device_id) {
        return self::post('/api/public/plugin/select-device', [
            'license_key' => $license_key, 'device_id' => $device_id,
        ]);
    }
    public static function send($license_key, $recipient, $message, $customer_name = '') {
        $payload = [
            'license_key' => $license_key,
            'recipient'   => $recipient,
            'message'     => $message,
        ];
        if (!empty($customer_name)) $payload['customer_name'] = $customer_name;
        return self::post('/api/public/plugin/send', $payload);
    }
    public static function heartbeat($license_key) {
        return self::post('/api/public/plugin/heartbeat', ['license_key' => $license_key]);
    }
    public static function stats($license_key) {
        return self::get('/api/public/plugin/stats', ['license_key' => $license_key]);
    }
}
