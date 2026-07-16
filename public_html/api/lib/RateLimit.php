<?php
namespace MiaTech;

/** Rate limiting simple basado en archivos (por IP + bucket). Anti fuerza bruta. */
class RateLimit
{
    public static function comprobar(string $bucket, int $max, int $ventanaSeg): void
    {
        try {
            $dir = rtrim((string) \config('storage.local_path'), '/') . '/tmp/ratelimit';
            if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
                throw new \RuntimeException("No se pudo crear el directorio de rate limit: $dir");
            }
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'cli';
            $file = $dir . '/' . md5($bucket . '|' . $ip) . '.json';
            $now = time();
            $hits = [];
            if (is_file($file)) {
                $contenido = @file_get_contents($file);
                $d = $contenido !== false ? json_decode($contenido, true) : null;
                if (is_array($d)) $hits = $d;
            }
            $hits = array_values(array_filter($hits, fn($t) => $t > $now - $ventanaSeg));
            if (count($hits) >= $max) {
                Response::error('Demasiados intentos. Espera un momento e intenta de nuevo.', 429);
            }
            $hits[] = $now;
            if (@file_put_contents($file, json_encode($hits), LOCK_EX) === false) {
                error_log("RateLimit: no se pudo escribir en $file (revisar permisos/existencia de storage/)");
            }
        } catch (\RuntimeException $e) {
            // Si storage/ no existe o no es escribible, no tumbamos la request (fail-open):
            // solo se pierde la proteccion de rate limit hasta que se corrija el storage.
            error_log('RateLimit deshabilitado temporalmente: ' . $e->getMessage());
        }
    }
}
