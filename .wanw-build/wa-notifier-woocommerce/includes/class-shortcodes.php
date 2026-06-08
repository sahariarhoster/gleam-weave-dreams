<?php
if (!defined('ABSPATH')) exit;

class WANW_Shortcodes {
    public static function render($template, $order) {
        if (!$order instanceof WC_Order) return $template;
        $repl = [
            '{first_name}' => $order->get_billing_first_name(),
            '{last_name}'  => $order->get_billing_last_name(),
            '{full_name}'  => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
            '{order_id}'   => $order->get_id(),
            '{order_number}' => $order->get_order_number(),
            '{status}'     => wc_get_order_status_name($order->get_status()),
            '{total}'      => html_entity_decode(strip_tags(wc_price($order->get_total()))),
            '{currency}'   => $order->get_currency(),
            '{phone}'      => $order->get_billing_phone(),
            '{email}'      => $order->get_billing_email(),
            '{site_name}'  => get_bloginfo('name'),
        ];
        return strtr($template, $repl);
    }

    public static function available() {
        return [
            '{first_name}', '{last_name}', '{full_name}',
            '{order_id}', '{order_number}', '{status}',
            '{total}', '{currency}', '{phone}', '{email}', '{site_name}',
        ];
    }
}
