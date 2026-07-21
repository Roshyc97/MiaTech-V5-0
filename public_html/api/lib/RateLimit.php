<?php
namespace MiaTech;

/**
 * Rate limiting basado en BD (tabla rate_limit_attempts).
 * Anti fuerza bruta con almacenamiento en BD (más seguro que ficheros).
 *
 * Cambio v5.0: Migrado de ficheros JSON a BD
 * - Motivo: Si /storage/ falla, no había protección (fail-open era riesgo)
 * - Solución: Usar tabla rate_limit_attempts, siempre disponible si BD está UP
 */
class RateLimit
{
    public static function comprobar(string $bucket, int $max, int $ventanaSeg): void
    {
        try {
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'cli';
            $now = time();
            $limiteTime = $now - $ventanaSeg;

            // 1. Limpiar intentos antiguos (fuera de ventana_seg)
            // timestamp es UNIX (entero), así que comparación simple
            Database::run(
                'DELETE FROM rate_limit_attempts WHERE bucket = ? AND ip_address = ? AND timestamp < ?',
                [$bucket, $ip, $limiteTime]
            );

            // 2. Contar intentos recientes (últimos ventana_seg segundos)
            $resultado = Database::get(
                'SELECT COUNT(*) AS count FROM rate_limit_attempts WHERE bucket = ? AND ip_address = ?',
                [$bucket, $ip]
            );
            $count = (int) ($resultado['count'] ?? 0);

            // 3. Si alcanzó máximo: bloquear
            if ($count >= $max) {
                Response::error('Demasiados intentos. Espera un momento e intenta de nuevo.', 429);
            }

            // 4. Registrar este intento (timestamp = UNIX time)
            Database::run(
                'INSERT INTO rate_limit_attempts (bucket, ip_address, timestamp) VALUES (?, ?, ?)',
                [$bucket, $ip, $now]
            );
        } catch (\Throwable $e) {
            // Si BD falla (conexión perdida), loguear pero NO bloquear (fail-open).
            // Razón: Mejor permitir login sin rate limit que bloquear todo si BD está caída.
            error_log('RateLimit: error de BD: ' . $e->getMessage());
        }
    }
}
