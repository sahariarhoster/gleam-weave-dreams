<?php
if (!defined('ABSPATH')) exit;
if (!current_user_can('manage_options')) return;

$result = null;
if ($_SERVER['REQUEST_METHOD']==='POST' && check_admin_referer('wanw_test')) {
    $to = sanitize_text_field($_POST['recipient'] ?? '');
    $msg = sanitize_textarea_field($_POST['message'] ?? '');
    $result = WANW_Api::send(WANW_Settings::license(), $to, $msg);
}
?>
<div class="wrap">
    <h1>Send Test Message</h1>
    <?php if ($result): ?>
        <div class="notice notice-<?php echo !empty($result['ok']) ? 'success' : 'error'; ?>">
            <p><?php echo esc_html(!empty($result['ok']) ? ('Sent: ' . ($result['message'] ?? '')) : ('Error: ' . ($result['error'] ?? ''))); ?></p>
        </div>
    <?php endif; ?>
    <form method="post">
        <?php wp_nonce_field('wanw_test'); ?>
        <p><label>Recipient<br><input type="text" name="recipient" class="regular-text" required placeholder="+8801XXXXXXXXX"></label></p>
        <p><label>Message<br><textarea name="message" rows="3" class="large-text" required>Test from WA Notifier</textarea></label></p>
        <p><button class="button button-primary">Send</button></p>
    </form>
</div>
