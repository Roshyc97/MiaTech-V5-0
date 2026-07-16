<?php
/**
 * tools/migrate.php — Crea/actualiza el esquema de la BD (CLI).
 * Uso:  php tools/migrate.php [--seed]
 * En SiteGround: ejecutar por SSH o cron. DB_DRIVER en .env define MySQL o SQLite.
 */
require __DIR__ . '/../public_html/api/bootstrap.php';

use MiaTech\Database;
use MiaTech\Schema;
use MiaTech\Seed;

fwrite(STDOUT, "== MiaTech · migracion de BD ==\n");
fwrite(STDOUT, 'Driver: ' . \config('db.driver') . "\n");

try {
    Schema::crear(Database::conn());
    fwrite(STDOUT, "Esquema creado/verificado (11 tablas).\n");

    if (in_array('--seed', $argv, true)) {
        $r = Seed::ejecutar();
        fwrite(STDOUT, 'Seed: ' . json_encode($r) . "\n");
    }
    fwrite(STDOUT, "OK\n");
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, 'ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
