<?php
if (!defined('ABSPATH')) exit;
$brand = WANW_Settings::brand();
$lic = WANW_Settings::license();
$hb = $lic ? WANW_Api::heartbeat($lic) : null;
$stats = $lic ? WANW_Api::stats($lic) : null;
$remote = $lic ? WANW_Updater::fetch_remote(!empty($_GET['wanw_update_checked'])) : null;
$has_update = is_array($remote) && !empty($remote['version']) && version_compare(WANW_VERSION, $remote['version'], '<');
$totals = !empty($stats['ok']) ? $stats['totals'] : ['sent'=>0,'failed'=>0,'today'=>0,'contacts'=>0];
$series = !empty($stats['ok']) ? $stats['series'] : [];
$max = 1;
foreach ($series as $d) { $max = max($max, intval($d['sent']) + intval($d['failed'])); }
?>
<div class="wrap wanw-dash">
    <?php if (!$lic): ?>
        <div class="wanw-hero">
            <h1>👋 Welcome to WA Notifier</h1>
            <p>Activate your license to start sending WhatsApp notifications from WooCommerce.</p>
            <a class="wanw-btn wanw-btn-primary" href="<?php echo esc_url(admin_url('admin.php?page=wanw-wizard')); ?>">Start Setup Wizard →</a>
        </div>
    <?php else: ?>
        <div class="wanw-topbar">
            <div>
                <h1>WA Notifier</h1>
                <p class="wanw-sub">Brand: <strong><?php echo esc_html($brand['name'] ?? '—'); ?></strong>
                    · Status:
                    <?php if (!empty($hb['ok'])): ?>
                        <span class="wanw-pill wanw-pill-ok">● Connected</span>
                    <?php else: ?>
                        <span class="wanw-pill wanw-pill-bad">● Offline</span>
                    <?php endif; ?>
                </p>
            </div>
            <div class="wanw-actions">
                <a class="wanw-btn" href="<?php echo esc_url(wp_nonce_url(admin_url('admin-post.php?action=wanw_check_update'), 'wanw_check_update')); ?>">Check Update</a>
                <a class="wanw-btn" href="<?php echo esc_url(admin_url('admin.php?page=wanw-test')); ?>">Send Test</a>
                <a class="wanw-btn wanw-btn-primary" href="<?php echo esc_url(admin_url('admin.php?page=wanw-woo')); ?>">Templates</a>
            </div>
        </div>

        <div class="wanw-update-card <?php echo $has_update ? 'wanw-update-ready' : ''; ?>">
            <div>
                <div class="wanw-stat-label">Plugin Update</div>
                <strong><?php echo $has_update ? 'Version ' . esc_html($remote['version']) . ' is ready' : 'WA Notifier is up to date'; ?></strong>
                <p><?php echo $has_update ? 'Install the newest dashboard, updater, and automation improvements.' : 'Current version ' . esc_html(WANW_VERSION) . ' is installed.'; ?></p>
            </div>
            <?php if ($has_update): ?>
                <a class="wanw-btn wanw-btn-primary" href="<?php echo esc_url(WANW_Updater::update_url()); ?>">Update Now</a>
            <?php else: ?>
                <a class="wanw-btn" href="<?php echo esc_url(wp_nonce_url(admin_url('admin-post.php?action=wanw_check_update'), 'wanw_check_update')); ?>">Refresh</a>
            <?php endif; ?>
        </div>

        <div class="wanw-stat-grid">
            <div class="wanw-stat"><div class="wanw-stat-label">Today</div><div class="wanw-stat-value"><?php echo intval($totals['today']); ?></div><div class="wanw-stat-meta">messages sent today</div></div>
            <div class="wanw-stat"><div class="wanw-stat-label">7-day Sent</div><div class="wanw-stat-value"><?php echo intval($totals['sent']); ?></div><div class="wanw-stat-meta">successful deliveries</div></div>
            <div class="wanw-stat"><div class="wanw-stat-label">7-day Failed</div><div class="wanw-stat-value wanw-bad"><?php echo intval($totals['failed']); ?></div><div class="wanw-stat-meta">errors / retries</div></div>
            <div class="wanw-stat"><div class="wanw-stat-label">WordPress Contacts</div><div class="wanw-stat-value"><?php echo intval($totals['contacts']); ?></div><div class="wanw-stat-meta">in WordPress group</div></div>
        </div>

        <div class="wanw-card">
            <div class="wanw-card-head">
                <h2>Last 7 days</h2>
                <span class="wanw-muted">sent vs failed</span>
            </div>
            <div class="wanw-chart">
                <?php foreach ($series as $d): $sent = intval($d['sent']); $failed = intval($d['failed']); $h1 = $sent ? max(6, round($sent * 140 / $max)) : 2; $h2 = $failed ? max(4, round($failed * 140 / $max)) : 0; ?>
                    <div class="wanw-col">
                        <div class="wanw-bar-wrap">
                            <?php if ($failed): ?><div class="wanw-bar wanw-bar-fail" style="height:<?php echo $h2; ?>px" title="Failed: <?php echo $failed; ?>"></div><?php endif; ?>
                            <div class="wanw-bar wanw-bar-ok" style="height:<?php echo $h1; ?>px" title="Sent: <?php echo $sent; ?>"></div>
                        </div>
                        <span class="wanw-col-label"><?php echo esc_html(date('D', strtotime($d['date']))); ?></span>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

        <div class="wanw-grid-2">
            <div class="wanw-card">
                <h2>Connection</h2>
                <table class="wanw-kv">
                    <tr><th>License</th><td><code><?php echo esc_html($lic); ?></code></td></tr>
                    <tr><th>Brand</th><td><?php echo esc_html($brand['name'] ?? '—'); ?></td></tr>
                    <tr><th>Device</th><td><?php echo esc_html(WANW_Settings::device() ?: '— not selected —'); ?></td></tr>
                    <tr><th>Version</th><td><?php echo esc_html(WANW_VERSION); ?></td></tr>
                </table>
                <p>
                    <a class="wanw-btn" href="<?php echo esc_url(admin_url('admin.php?page=wanw-license')); ?>">Change License</a>
                </p>
            </div>

            <div class="wanw-card">
                <h2>Quick links</h2>
                <ul class="wanw-links">
                    <li><a href="<?php echo esc_url(admin_url('admin.php?page=wanw-woo')); ?>">📦 Customer notification templates</a></li>
                    <li><a href="<?php echo esc_url(admin_url('admin.php?page=wanw-admin')); ?>">🔔 Admin alerts</a></li>
                    <li><a href="<?php echo esc_url(admin_url('admin.php?page=wanw-test')); ?>">✉️ Send a test message</a></li>
                    <li><a href="<?php echo esc_url(admin_url('admin.php?page=wanw-license')); ?>">🔑 License settings</a></li>
                </ul>
            </div>
        </div>
    <?php endif; ?>
</div>
