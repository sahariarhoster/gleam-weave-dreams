<?php
if (!defined('ABSPATH')) exit;
class WANW_Wizard {
    public static function steps() {
        return [
            1 => 'Activate License',
            2 => 'Select Device',
            3 => 'WooCommerce Templates',
            4 => 'Admin Templates',
            5 => 'Test Send',
        ];
    }
    public static function current() {
        return max(1, min(5, intval($_GET['step'] ?? 1)));
    }
    public static function url($step) {
        return admin_url('admin.php?page=wanw-wizard&step=' . intval($step));
    }
}
