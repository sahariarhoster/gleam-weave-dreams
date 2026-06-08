<?php
/**
 * WA Notifier — WHMCS Provisioning Module
 *
 * Place in: /modules/servers/wanotifier/wanotifier.php
 *
 * On the WHMCS server, configure:
 *   - Hostname: full URL of your WA Notifier install (e.g. https://app.example.com)
 *   - Access Hash: the API token from WA Notifier → Billing
 */

if (!defined("WHMCS")) die("This file cannot be accessed directly");

function wanotifier_MetaData() {
    return [
        "DisplayName" => "WA Notifier",
        "APIVersion" => "1.1",
        "RequiresServer" => true,
    ];
}

function wanotifier_ConfigOptions() {
    return [
        "Message Limit" => [
            "Type" => "text", "Size" => "10", "Default" => "1000",
            "Description" => "Monthly messages (blank = unlimited)",
        ],
        "Device Limit" => [
            "Type" => "text", "Size" => "5", "Default" => "1",
        ],
    ];
}

function wanotifier_apiCall($params, $path, $body) {
    $base = rtrim($params["serverhostname"] ?: $params["serverip"], "/");
    if (strpos($base, "http") !== 0) {
        $base = ($params["serversecure"] ? "https://" : "http://") . $base;
    }
    $token = $params["serveraccesshash"];

    $ch = curl_init($base . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($body),
        CURLOPT_HTTPHEADER => [
            "Content-Type: application/json",
            "X-WHMCS-Token: " . $token,
        ],
        CURLOPT_TIMEOUT => 30,
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($err) return ["ok" => false, "error" => $err];
    $json = json_decode($res, true);
    if ($code >= 400) return ["ok" => false, "error" => $json["error"] ?? $res, "code" => $code];
    return ["ok" => true, "data" => $json];
}

function wanotifier_buildBody($params, $extra = []) {
    $msgLimit = $params["configoption1"] !== "" ? intval($params["configoption1"]) : null;
    $devLimit = $params["configoption2"] !== "" ? intval($params["configoption2"]) : 1;
    $expires = null;
    if (!empty($params["model"]->nextduedate)) {
        $expires = date("c", strtotime($params["model"]->nextduedate));
    }
    return array_merge([
        "service_id"    => (string) $params["serviceid"],
        "product_id"    => (string) $params["pid"],
        "brand_name"    => $params["domain"] ?: ($params["clientsdetails"]["companyname"] ?: $params["clientsdetails"]["fullname"]),
        "owner_email"   => $params["clientsdetails"]["email"],
        "owner_name"    => trim($params["clientsdetails"]["firstname"] . " " . $params["clientsdetails"]["lastname"]),
        "message_limit" => $msgLimit,
        "device_limit"  => $devLimit,
        "expires_at"    => $expires,
    ], $extra);
}

function wanotifier_CreateAccount(array $params) {
    try {
        $res = wanotifier_apiCall($params, "/api/public/whmcs/provision", wanotifier_buildBody($params));
        if (!$res["ok"]) return "Provision failed: " . ($res["error"] ?? "unknown");
        // If a fresh password was generated, store it back into WHMCS so the welcome email can use {$service_password}
        if (!empty($res["data"]["password"])) {
            try {
                localAPI("UpdateClientProduct", [
                    "serviceid" => $params["serviceid"],
                    "serviceusername" => $res["data"]["email"],
                    "servicepassword" => $res["data"]["password"],
                ]);
            } catch (\Throwable $e) {}
        }
        return "success";
    } catch (\Throwable $e) { return $e->getMessage(); }
}

function wanotifier_SuspendAccount(array $params) {
    $res = wanotifier_apiCall($params, "/api/public/whmcs/suspend", ["service_id" => (string) $params["serviceid"]]);
    return $res["ok"] ? "success" : "Suspend failed: " . ($res["error"] ?? "unknown");
}

function wanotifier_UnsuspendAccount(array $params) {
    $res = wanotifier_apiCall($params, "/api/public/whmcs/unsuspend", ["service_id" => (string) $params["serviceid"]]);
    return $res["ok"] ? "success" : "Unsuspend failed: " . ($res["error"] ?? "unknown");
}

function wanotifier_TerminateAccount(array $params) {
    $res = wanotifier_apiCall($params, "/api/public/whmcs/terminate", [
        "service_id" => (string) $params["serviceid"],
        "delete_brand" => false,
    ]);
    return $res["ok"] ? "success" : "Terminate failed: " . ($res["error"] ?? "unknown");
}

function wanotifier_ChangePackage(array $params) {
    $res = wanotifier_apiCall($params, "/api/public/whmcs/update", wanotifier_buildBody($params));
    return $res["ok"] ? "success" : "Update failed: " . ($res["error"] ?? "unknown");
}

function wanotifier_Renew(array $params) {
    // Push the new due-date over so brand stays active.
    $res = wanotifier_apiCall($params, "/api/public/whmcs/update", wanotifier_buildBody($params));
    return $res["ok"] ? "success" : "Renew failed: " . ($res["error"] ?? "unknown");
}

function wanotifier_TestConnection(array $params) {
    $base = rtrim($params["serverhostname"], "/");
    if (strpos($base, "http") !== 0) $base = ($params["serversecure"] ? "https://" : "http://") . $base;
    $ch = curl_init($base . "/api/public/whmcs/suspend");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(["service_id" => "__test__"]),
        CURLOPT_HTTPHEADER => ["Content-Type: application/json", "X-WHMCS-Token: " . $params["serveraccesshash"]],
        CURLOPT_TIMEOUT => 15,
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code === 401) return ["success" => false, "error" => "Invalid API token"];
    if ($code === 0)   return ["success" => false, "error" => "Cannot reach server"];
    return ["success" => true, "error" => ""];
}
