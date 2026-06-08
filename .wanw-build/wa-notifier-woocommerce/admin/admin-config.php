<?php
if (!defined('ABSPATH')) exit;
if (!current_user_can('manage_options')) return;

if ($_SERVER['REQUEST_METHOD']==='POST' && check_admin_referer('wanw_admin')) {
    $ac = WANW_Settings::admin_config();
    $ac['phone'] = sanitize_text_field($_POST['admin_phone'] ?? '');
    foreach (WANW_Settings::woo_statuses() as $k => $_) {
        $ac['statuses'][$k] = [
            'enabled'  => !empty($_POST['enabled'][$k]),
            'template' => wp_kses_post($_POST['template'][$k] ?? ''),
        ];
    }
    update_option(WANW_Settings::OPT_ADMIN, $ac);
    echo '<div class="notice notice-success"><p>Saved.</p></div>';
}
$ac = WANW_Settings::admin_config();
?>
<div class="wrap">
    <h1>Admin Notifications</h1>
    <form method="post">
        <?php wp_nonce_field('wanw_admin'); ?>
        <p><label>Admin WhatsApp Number<br>
            <input type="text" name="admin_phone" class="regular-text" value="<?php echo esc_attr($ac['phone']); ?>" placeholder="+8801XXXXXXXXX">
        </label></p>
        <table class="widefat striped">
            <thead><tr><th style="width:60px;">On</th><th style="width:150px;">Status</th><th>Admin Message</th></tr></thead>
            <tbody>
            <?php foreach (WANW_Settings::woo_statuses() as $k => $label): ?>
                <tr>
                    <td><input type="checkbox" name="enabled[<?php echo esc_attr($k); ?>]" <?php checked(!empty($ac['statuses'][$k]['enabled'])); ?>></td>
                    <td><?php echo esc_html($label); ?></td>
                    <td><textarea name="template[<?php echo esc_attr($k); ?>]" rows="2" style="width:100%;"><?php echo esc_textarea($ac['statuses'][$k]['template']); ?></textarea></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
        <p><button class="button button-primary">Save</button></p>
    </form>
</div>
