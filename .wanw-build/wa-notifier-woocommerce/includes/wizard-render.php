<?php
if (!defined('ABSPATH')) exit;
if (!current_user_can('manage_options')) return;

$step = WANW_Wizard::current();
$message = '';
$error = '';

// ---- handle posts ----
if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('wanw_wizard')) {
    if ($step === 1) {
        $key = sanitize_text_field($_POST['license_key'] ?? '');
        delete_option(WANW_Settings::OPT_API_BASE);
        $res = WANW_Api::activate($key, home_url());
        if (!empty($res['ok'])) {
            update_option(WANW_Settings::OPT_LICENSE, $key);
            update_option(WANW_Settings::OPT_BRAND, [
                'id' => $res['brand_id'] ?? '', 'name' => $res['brand_name'] ?? '',
            ]);
            if (!empty($res['device_id'])) update_option(WANW_Settings::OPT_DEVICE, $res['device_id']);
            wp_safe_redirect(WANW_Wizard::url(2)); exit;
        } else {
            $error = $res['error'] ?? 'Activation failed';
        }
    } elseif ($step === 2) {
        $device_id = sanitize_text_field($_POST['device_id'] ?? '');
        $res = WANW_Api::select_device(WANW_Settings::license(), $device_id);
        if (!empty($res['ok'])) {
            update_option(WANW_Settings::OPT_DEVICE, $device_id);
            wp_safe_redirect(WANW_Wizard::url(3)); exit;
        }
        $error = $res['error'] ?? 'Could not save device';
    } elseif ($step === 3) {
        $cfg = [];
        foreach (WANW_Settings::woo_statuses() as $k => $_) {
            $cfg[$k] = [
                'enabled'  => !empty($_POST['enabled'][$k]),
                'template' => wp_kses_post($_POST['template'][$k] ?? ''),
            ];
        }
        update_option(WANW_Settings::OPT_WOO, $cfg);
        wp_safe_redirect(WANW_Wizard::url(4)); exit;
    } elseif ($step === 4) {
        $ac = WANW_Settings::admin_config();
        $ac['phone'] = sanitize_text_field($_POST['admin_phone'] ?? '');
        foreach (WANW_Settings::woo_statuses() as $k => $_) {
            $ac['statuses'][$k] = [
                'enabled'  => !empty($_POST['enabled'][$k]),
                'template' => wp_kses_post($_POST['template'][$k] ?? ''),
            ];
        }
        update_option(WANW_Settings::OPT_ADMIN, $ac);
        wp_safe_redirect(WANW_Wizard::url(5)); exit;
    } elseif ($step === 5) {
        $to = sanitize_text_field($_POST['recipient'] ?? '');
        $msg = sanitize_textarea_field($_POST['message'] ?? 'Test from WA Notifier');
        $res = WANW_Api::send(WANW_Settings::license(), $to, $msg);
        if (!empty($res['ok'])) {
            update_option(WANW_Settings::OPT_COMPLETE, 1);
            $message = 'Test sent successfully! Redirecting to dashboard…';
            $redirect_to_dashboard = true;
        } else {
            $error = $res['error'] ?? 'Test failed';
        }
    }
}

$steps = WANW_Wizard::steps();
?>
<div class="wrap wanw-wizard">
    <h1>WA Notifier Setup</h1>
    <ol class="wanw-steps">
        <?php foreach ($steps as $n => $label): ?>
            <li class="<?php echo $n === $step ? 'active' : ($n < $step ? 'done' : ''); ?>">
                <span><?php echo $n; ?>.</span> <?php echo esc_html($label); ?>
            </li>
        <?php endforeach; ?>
    </ol>

    <?php if ($error): ?><div class="notice notice-error"><p><?php echo esc_html($error); ?></p></div><?php endif; ?>
    <?php if ($message): ?><div class="notice notice-success"><p><?php echo esc_html($message); ?></p></div><?php endif; ?>
    <?php if (!empty($redirect_to_dashboard)): $dash = admin_url('admin.php?page=wanw-dashboard'); ?>
        <meta http-equiv="refresh" content="2;url=<?php echo esc_url($dash); ?>">
        <script>setTimeout(function(){ window.location.href = <?php echo wp_json_encode($dash); ?>; }, 1500);</script>
    <?php endif; ?>

    <form method="post" class="wanw-card">
        <?php wp_nonce_field('wanw_wizard'); ?>

        <?php if ($step === 1): ?>
            <h2>Step 1 — Activate License</h2>
            <p>Paste the license key from your WA Notifier brand owner panel.</p>
            <p>
                <label>License Key<br>
                    <input type="text" name="license_key" class="regular-text" placeholder="HS-XXXX-XXXX-XXXX-XXXX" required>
                </label>
            </p>
            <p>
                <label>API Base URL<br>
                    <input type="url" name="api_base" class="regular-text" value="<?php echo esc_attr(WANW_Settings::api_base()); ?>" required>
                </label>
            </p>
            <p><button class="button button-primary">Activate</button></p>

        <?php elseif ($step === 2): ?>
            <h2>Step 2 — Select Device</h2>
            <?php $d = WANW_Api::devices(WANW_Settings::license()); ?>
            <?php if (empty($d['ok']) || empty($d['devices'])): ?>
                <p>No devices found for this brand. Ask your brand owner to add a device in the panel.</p>
            <?php else: ?>
                <p>Choose which WhatsApp device this site will use to send messages.</p>
                <p>
                    <select name="device_id" required>
                        <option value="">— Select —</option>
                        <?php foreach ($d['devices'] as $dev): ?>
                            <option value="<?php echo esc_attr($dev['id']); ?>" <?php selected($d['selected_device_id'] ?? '', $dev['id']); ?>>
                                <?php echo esc_html($dev['name']); ?> (<?php echo esc_html($dev['status']); ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </p>
                <p><button class="button button-primary">Save & Continue</button></p>
            <?php endif; ?>

        <?php elseif ($step === 3): ?>
            <h2>Step 3 — WooCommerce Customer Templates</h2>
            <p>Turn on the order statuses where you want to notify the customer. Use shortcodes:
                <code><?php echo esc_html(implode(' ', WANW_Shortcodes::available())); ?></code></p>
            <?php $woo = WANW_Settings::woo_config(); ?>
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
            <p><button class="button button-primary">Save & Continue</button></p>

        <?php elseif ($step === 4): ?>
            <h2>Step 4 — Admin Templates</h2>
            <?php $ac = WANW_Settings::admin_config(); ?>
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
            <p><button class="button button-primary">Save & Continue</button></p>

        <?php elseif ($step === 5): ?>
            <h2>Step 5 — Test Send</h2>
            <p><label>Recipient WhatsApp Number<br>
                <input type="text" name="recipient" class="regular-text" required placeholder="+8801XXXXXXXXX">
            </label></p>
            <p><label>Message<br>
                <textarea name="message" rows="3" style="width:100%;">Hello from WA Notifier setup wizard 🎉</textarea>
            </label></p>
            <p>
                <button class="button button-primary">Send Test</button>
                <a class="button" href="<?php echo esc_url(admin_url('admin.php?page=wanw-dashboard')); ?>">Skip / Finish</a>
            </p>
        <?php endif; ?>
    </form>
</div>
