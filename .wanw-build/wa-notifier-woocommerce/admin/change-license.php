<?php
if (!defined('ABSPATH')) exit;
if (!current_user_can('manage_options')) return;

if ($_SERVER['REQUEST_METHOD']==='POST' && check_admin_referer('wanw_lic')) {
    if (isset($_POST['reset'])) {
        delete_option(WANW_Settings::OPT_LICENSE);
        delete_option(WANW_Settings::OPT_BRAND);
        delete_option(WANW_Settings::OPT_DEVICE);
        delete_option(WANW_Settings::OPT_COMPLETE);
        echo '<div class="notice notice-success"><p>License cleared. Re-run the setup wizard.</p></div>';
    } else {
        $key = sanitize_text_field($_POST['license_key'] ?? '');
        delete_option(WANW_Settings::OPT_API_BASE);
        $res = WANW_Api::activate($key, home_url());
        if (!empty($res['ok'])) {
            update_option(WANW_Settings::OPT_LICENSE, $key);
            update_option(WANW_Settings::OPT_BRAND, ['id'=>$res['brand_id']??'','name'=>$res['brand_name']??'']);
            echo '<div class="notice notice-success"><p>License updated.</p></div>';
        } else {
            echo '<div class="notice notice-error"><p>'.esc_html($res['error']??'Failed').'</p></div>';
        }
    }
}
?>
<div class="wrap">
    <h1>Change License</h1>
    <form method="post">
        <?php wp_nonce_field('wanw_lic'); ?>
        <p><label>License Key<br><input type="text" name="license_key" class="regular-text" value="<?php echo esc_attr(WANW_Settings::license()); ?>"></label></p>
        <p><label>API Base URL<br><input type="url" name="api_base" class="regular-text" value="<?php echo esc_attr(WANW_Settings::api_base()); ?>"></label></p>
        <p>
            <button class="button button-primary">Activate</button>
            <button class="button" name="reset" value="1" onclick="return confirm('Clear license?');">Clear License</button>
        </p>
    </form>
</div>
