<?php
/**
 * tools/seed.php — Carga datos de prueba (solo desarrollo). Uso: php tools/seed.php
 */
require __DIR__ . '/../public_html/api/bootstrap.php';

use MiaTech\Seed;

try {
    $r = \MiaTech\Seed::ejecutar();
    fwrite(STDOUT, 'Seed cargado: ' . json_encode($r) . "\n");
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, 'ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
