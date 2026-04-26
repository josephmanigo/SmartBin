<?php
// ─── CORS ────────────────────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── Autoload controllers ────────────────────────────────────────────────────
spl_autoload_register(function (string $class) {
    $paths = [
        __DIR__ . '/controllers/' . $class . '.php',
        __DIR__ . '/middleware/'  . $class . '.php',
        __DIR__ . '/config/'      . $class . '.php',
    ];
    foreach ($paths as $path) {
        if (file_exists($path)) { require_once $path; return; }
    }
});

// ─── JWT library (composer) ───────────────────────────────────────────────────
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}

// ─── Router ──────────────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Strip base path
$basePath = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
if ($basePath !== '/') {
    if (strpos($uri, $basePath) === 0) {
        $uri = substr($uri, strlen($basePath));
    }
}

// Strip /api prefix if running under /api sub-path
$uri = preg_replace('#^/api#', '', $uri);
$uri = rtrim($uri, '/') ?: '/';

// Match routes
try {
    // AUTH
    if ($uri === '/auth/register' && $method === 'POST') {
        (new AuthController())->register();

    } elseif ($uri === '/auth/login' && $method === 'POST') {
        (new AuthController())->login();

    } elseif ($uri === '/auth/me' && $method === 'GET') {
        (new AuthController())->me();

    } elseif ($uri === '/auth/avatar' && $method === 'PUT') {
        (new AuthController())->updateAvatar();

    // ARDUINO
    } elseif ($uri === '/arduino/data' && $method === 'POST') {
        (new ArduinoController())->receive();

    // BINS & LOGS
    } elseif ($uri === '/logs' && $method === 'GET') {
        (new BinController())->allLogs();

    } elseif ($uri === '/bins' && $method === 'GET') {
        (new BinController())->index();

    } elseif ($uri === '/bins' && $method === 'POST') {
        (new BinController())->store();

    // BINS single - extract id
    } elseif (preg_match('#^/bins/(\d+)/logs$#', $uri, $m) && $method === 'GET') {
        (new BinController())->logs((int) $m[1]);

    } elseif (preg_match('#^/bins/(\d+)$#', $uri, $m)) {
        $ctrl = new BinController();
        match ($method) {
            'GET'    => $ctrl->show((int) $m[1]),
            'PUT'    => $ctrl->update((int) $m[1]),
            'DELETE' => $ctrl->destroy((int) $m[1]),
            default  => (function() { http_response_code(405); echo json_encode(['success'=>false,'message'=>'Method not allowed']); })(),
        };

    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Endpoint not found.']);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Internal server error.', 'debug' => $e->getMessage()]);
}
