<?php
namespace MiaTech;

/** Helpers de respuesta JSON. Convencion { ok: true|false } (compatible con frontend v4-0). */
class Response
{
    public static function json($datos, int $codigo = 200): void
    {
        http_response_code($codigo);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function ok($datos = [], int $codigo = 200): void
    {
        self::json(array_merge(['ok' => true], (array) $datos), $codigo);
    }

    public static function error(string $mensaje, int $codigo = 400, array $extra = []): void
    {
        self::json(array_merge(['ok' => false, 'error' => $mensaje], $extra), $codigo);
    }

    public static function noImplementado(string $ruta): void
    {
        self::error("Endpoint no implementado todavia: $ruta", 501);
    }
}
