<?php
/**
 * Pricing proxy — only needed when the pages are NOT served from a
 * pharmeasy.in origin.
 *
 * api.pharmeasy.in reflects Access-Control-Allow-Origin back only for
 * pharmeasy.in hosts. Verified:
 *     Origin: https://pharmeasy.in   -> access-control-allow-origin: https://pharmeasy.in
 *     Origin: https://example.com    -> no CORS headers at all
 *
 * So a browser on any other domain has its fetch blocked. Drop this file on
 * the CyberPanel host and point PUBLIC_PRICE_API at it:
 *     /medicines-by-class/price-proxy.php?id={id}
 *
 * If the pages end up served from pharmeasy.in, delete this file and call the
 * API directly — one less hop.
 */

declare(strict_types=1);

const UPSTREAM   = 'https://api.pharmeasy.in/v5/product-details/%d/dynamic';
const CACHE_DIR  = __DIR__ . '/.price-cache';
const CACHE_TTL  = 60;      // seconds; matches the s-maxage we want at the edge
const TIMEOUT    = 8;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
header('X-Content-Type-Options: nosniff');

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if ($id === false || $id === null || $id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'id must be a positive integer']);
    exit;
}

// ---- serve from disk cache if fresh ---------------------------------------
if (!is_dir(CACHE_DIR)) {
    @mkdir(CACHE_DIR, 0775, true);
}
$cacheFile = CACHE_DIR . '/' . $id . '.json';
if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < CACHE_TTL) {
    header('X-Cache: HIT');
    readfile($cacheFile);
    exit;
}

// ---- fetch upstream, presenting a pharmeasy.in origin ----------------------
$ch = curl_init(sprintf(UPSTREAM, $id));
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => TIMEOUT,
    CURLOPT_CONNECTTIMEOUT => 4,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_HTTPHEADER     => [
        'Accept: application/json',
        'Origin: https://pharmeasy.in',
        'Referer: https://pharmeasy.in/',
        'User-Agent: PharmEasy-MedicinesByClass/1.0',
    ],
]);
$body   = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

// ---- upstream trouble: fall back to whatever we last cached ---------------
if ($status !== 200 || $body === false || json_decode($body) === null) {
    if (is_file($cacheFile)) {
        header('X-Cache: STALE');
        readfile($cacheFile);
        exit;
    }
    http_response_code(502);
    echo json_encode(['error' => 'upstream unavailable', 'status' => $status]);
    exit;
}

file_put_contents($cacheFile, $body, LOCK_EX);
header('X-Cache: MISS');
echo $body;
