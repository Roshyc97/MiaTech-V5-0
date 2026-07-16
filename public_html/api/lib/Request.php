<?php
namespace MiaTech;

/** Acceso uniforme a la entrada (JSON body, POST, GET) y metadatos. */
class Request
{
    private static ?array $json = null;

    public static function json(): array
    {
        if (self::$json === null) {
            $raw = file_get_contents('php://input');
            $d = json_decode((string) $raw, true);
            self::$json = is_array($d) ? $d : [];
        }
        return self::$json;
    }

    public static function input(string $k, $def = null)
    {
        $j = self::json();
        if (array_key_exists($k, $j)) return $j[$k];
        if (isset($_POST[$k])) return $_POST[$k];
        if (isset($_GET[$k])) return $_GET[$k];
        return $def;
    }

    public static function ip(): string { return $_SERVER['REMOTE_ADDR'] ?? 'unknown'; }
    public static function userAgent(): string { return substr($_SERVER['HTTP_USER_AGENT'] ?? 'unknown', 0, 250); }
}
