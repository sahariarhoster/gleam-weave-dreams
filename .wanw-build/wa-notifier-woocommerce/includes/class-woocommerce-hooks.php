<?php
if (!defined('ABSPATH')) exit;

class WANW_Woo_Hooks {
    public static function init() {
        add_action('woocommerce_order_status_changed', [__CLASS__, 'on_status_change'], 10, 4);
    }

    public static function on_status_change($order_id, $from, $to, $order) {
        if (!WANW_Settings::license() || !WANW_Settings::device()) return;
        if (!$order instanceof WC_Order) {
            $order = wc_get_order($order_id);
            if (!$order) return;
        }

        $woo   = WANW_Settings::woo_config();
        $admin = WANW_Settings::admin_config();
        $license = WANW_Settings::license();
        $customer_name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());

        // Customer
        if (!empty($woo[$to]['enabled'])) {
            $phone = $order->get_billing_phone();
            if ($phone) {
                $msg = WANW_Shortcodes::render($woo[$to]['template'], $order);
                WANW_Api::send($license, $phone, $msg, $customer_name);
            }
        }

        // Admin
        if (!empty($admin['statuses'][$to]['enabled']) && !empty($admin['phone'])) {
            $msg = WANW_Shortcodes::render($admin['statuses'][$to]['template'], $order);
            WANW_Api::send($license, $admin['phone'], $msg, 'Admin');
        }
    }
}
