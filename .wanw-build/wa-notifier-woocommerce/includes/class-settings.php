<?php
if (!defined('ABSPATH')) exit;

class WANW_Settings {
    const OPT_API_BASE  = 'wanw_api_base';
    const OPT_LICENSE   = 'wanw_license_key';
    const OPT_BRAND     = 'wanw_brand';
    const OPT_DEVICE    = 'wanw_device_id';
    const OPT_WOO       = 'wanw_woo_config';
    const OPT_ADMIN     = 'wanw_admin_config';
    const OPT_COMPLETE  = 'wanw_setup_complete';

    public static function api_base() {
        return rtrim(get_option(self::OPT_API_BASE, WANW_DEFAULT_API_BASE), '/');
    }
    public static function license() { return get_option(self::OPT_LICENSE, ''); }
    public static function brand()   { return get_option(self::OPT_BRAND, []); }
    public static function device()  { return get_option(self::OPT_DEVICE, ''); }

    public static function woo_config() {
        $defaults = [];
        foreach (self::woo_statuses() as $key => $label) {
            $defaults[$key] = [
                'enabled'  => false,
                'template' => "Hi {first_name}, your order #{order_id} is now {status}. Total: {total}",
            ];
        }
        $stored = get_option(self::OPT_WOO, []);
        return array_replace_recursive($defaults, is_array($stored) ? $stored : []);
    }

    public static function admin_config() {
        $defaults = [
            'phone'    => '',
            'statuses' => [],
        ];
        foreach (self::woo_statuses() as $key => $label) {
            $defaults['statuses'][$key] = [
                'enabled'  => false,
                'template' => "New order #{order_id} from {first_name} {last_name}. Status: {status}. Total: {total}",
            ];
        }
        $stored = get_option(self::OPT_ADMIN, []);
        return array_replace_recursive($defaults, is_array($stored) ? $stored : []);
    }

    public static function woo_statuses() {
        return [
            'pending'    => 'Pending payment',
            'processing' => 'Processing',
            'on-hold'    => 'On hold',
            'completed'  => 'Completed',
            'cancelled'  => 'Cancelled',
            'refunded'   => 'Refunded',
            'failed'     => 'Failed',
        ];
    }
}
