<?php
if (!defined('ABSPATH')) exit;
if (!current_user_can('manage_options')) return;

if ($_SERVER['REQUEST_METHOD']==='POST' && check_admin_referer('wanw_woo')) {
    $cfg = [];
    foreach (WANW_Settings::woo_statuses() as $k => $_) {
        $cfg[$k] = [
            'enabled'  => !empty($_POST['enabled'][$k]),
            'template' => wp_kses_post($_POST['template'][$k] ?? ''),
        ];
    }
    update_option(WANW_Settings::OPT_WOO, $cfg);
    echo '<div class="notice notice-success"><p>Saved.</p></div>';
}
$woo = WANW_Settings::woo_config();
?>
<div class="wrap">
    <h1>WooCommerce Customer Notifications</h1>
    <p>Shortcodes: <code><?php echo esc_html(implode(' ', WANW_Shortcodes::available())); ?></code></p>
    <form method="post">
        <?php wp_nonce_field('wanw_woo'); ?>
        <table class="widefat striped">
            <thead><tr><th style="width:60px;">On</th><th style="width:150px;">Status</th><th>Message Template</th></tr></thead>
            <tbody>
            <?php foreach (WANW_Settings::woo_statuses() as $k => $label): ?>
                <tr>
                    <td><input type="checkbox" name="enabled[<?php echo esc_attr($k); ?>]" <?php checked(!empty($woo[$k]['enabled'])); ?>></td>
                    <td><?php echo esc_html($label); ?></td>
                    <td><textarea name="template[<?php echo esc_attr($k); ?>]" rows="2" style="width:100%;"><?php echo esc_textarea($woo[$k]['template']); ?></textarea></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
        <p><button class="button button-primary">Save</button></p>
    </form>
</div>
