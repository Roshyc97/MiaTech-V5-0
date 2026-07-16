<?php
/**
 * bootstrap.php — Arranque comun de la API: config, autoload, sesion, cabeceras y helpers.
 */
declare(strict_types=1);

$GLOBALS['config'] = require __DIR__ . '/config.php';

if (!empty($GLOBALS['config']['app']['debug'])) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
    ini_set('display_errors', '0');
}

spl_autoload_register(function (string $clase): void {
    $prefijo = 'MiaTech\\';
    if (!str_starts_with($clase, $prefijo)) {
        return;
    }
    $relativa = str_replace('\\', '/', substr($clase, strlen($prefijo)));
    $archivo  = __DIR__ . '/lib/' . $relativa . '.php';
    if (is_file($archivo)) {
        require $archivo;
    }
});

if (PHP_SAPI !== 'cli') {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'httponly' => true,
            'samesite' => 'Lax',
            'secure'   => ($GLOBALS['config']['app']['env'] !== 'development'),
        ]);
        session_start();
    }

    // Handler global: los warnings/notices de PHP nunca deben imprimirse sueltos
    // (rompen el JSON de Response::ok/error). Se registran en el log del servidor
    // en vez de mostrarse; con APP_DEBUG=true se agregan al log con mas detalle.
    set_error_handler(function (int $errno, string $errstr, string $errfile, int $errline): bool {
        error_log("PHP [$errno] $errstr en $errfile:$errline");
        return true; // evita el comportamiento por defecto (imprimir en salida)
    });

    // Errores fatales (que no pasan por set_error_handler): responder JSON 500
    // en vez de dejar que el motor de PHP imprima HTML crudo.
    register_shutdown_function(function (): void {
        $error = error_get_last();
        $fatales = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
        if ($error && in_array($error['type'], $fatales, true) && !headers_sent()) {
            error_log("PHP FATAL [{$error['type']}] {$error['message']} en {$error['file']}:{$error['line']}");
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            $debug = !empty($GLOBALS['config']['app']['debug']);
            echo json_encode([
                'ok'    => false,
                'error' => $debug
                    ? "Error fatal: {$error['message']} en {$error['file']}:{$error['line']}"
                    : 'Error interno del servidor.',
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    });
}

function config(?string $ruta = null)
{
    $c = $GLOBALS['config'];
    if ($ruta === null) {
        return $c;
    }
    foreach (explode('.', $ruta) as $k) {
        if (!is_array($c) || !array_key_exists($k, $c)) {
            return null;
        }
        $c = $c[$k];
    }
    return $c;
}
