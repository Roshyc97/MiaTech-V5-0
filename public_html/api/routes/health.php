<?php
/**
 * /api/health — Confirma que el backend PHP corre y reporta el estado del entorno.
 * Sirve para validar el despliegue en SiteGround de un vistazo.
 */
use MiaTech\Response;
use MiaTech\Database;
use MiaTech\Storage\StorageFactory;

$estado = [
    'servicio' => 'MiaTech API (PHP)',
    'version'  => '5.0.0-esqueleto',
    'hora'     => date('c'),
    'php'      => PHP_VERSION,
    'entorno'  => \config('app.env'),
];

// Extensiones clave
foreach (['pdo_mysql', 'pdo_sqlite', 'curl', 'mbstring', 'gd', 'openssl'] as $e) {
    $estado['extensiones'][$e] = extension_loaded($e);
}

// ffmpeg (confirmado en Fase 0)
$ffmpeg = \config('ffmpeg.bin');
$out = [];
$code = 1;
if (function_exists('exec')) {
    @exec(escapeshellarg($ffmpeg) . ' -version 2>&1', $out, $code);
}
$estado['ffmpeg'] = ['disponible' => $code === 0, 'detalle' => $out[0] ?? 'no verificable'];

// Base de datos (no falla si aun no esta configurada)
$estado['bd'] = Database::ping();

// Driver de almacenamiento activo
try {
    $estado['storage'] = ['ok' => true, 'driver' => StorageFactory::crear()->nombre()];
} catch (\Throwable $e) {
    $estado['storage'] = ['ok' => false, 'error' => $e->getMessage()];
}

Response::ok($estado);
