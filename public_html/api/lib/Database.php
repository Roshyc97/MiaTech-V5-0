<?php
namespace MiaTech;

use PDO;
use PDOException;

/**
 * Database — conexion PDO agnostica. Soporta MySQL (SiteGround) y SQLite (local).
 * El resto de la app NO sabe que motor hay debajo; solo usa PDO.
 */
class Database
{
    private static ?PDO $pdo = null;

    public static function conn(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $cfg = \config('db');
        try {
            if ($cfg['driver'] === 'sqlite') {
                @mkdir(dirname($cfg['sqlite_path']), 0775, true);
                self::$pdo = new PDO('sqlite:' . $cfg['sqlite_path']);
                self::$pdo->exec('PRAGMA foreign_keys = ON');
            } else {
                $dsn = sprintf(
                    'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                    $cfg['host'], $cfg['port'], $cfg['name'], $cfg['charset']
                );
                self::$pdo = new PDO($dsn, $cfg['user'], $cfg['password']);
            }
            self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            return self::$pdo;
        } catch (PDOException $e) {
            throw new \RuntimeException('Error de conexion a BD: ' . $e->getMessage(), 0, $e);
        }
    }

    /** INSERT/UPDATE/DELETE con parametros; devuelve el ultimo ID insertado. */
    public static function run(string $sql, array $params = []): int
    {
        $st = self::conn()->prepare($sql);
        $st->execute($params);
        return (int) self::conn()->lastInsertId();
    }

    /** Una sola fila o null. */
    public static function get(string $sql, array $params = []): ?array
    {
        $st = self::conn()->prepare($sql);
        $st->execute($params);
        $row = $st->fetch();
        return $row === false ? null : $row;
    }

    /** Todas las filas. */
    public static function all(string $sql, array $params = []): array
    {
        $st = self::conn()->prepare($sql);
        $st->execute($params);
        return $st->fetchAll();
    }

    /** Prueba de conexion para el health check (no lanza excepcion). */
    public static function ping(): array
    {
        try {
            $driver = self::conn()->getAttribute(PDO::ATTR_DRIVER_NAME);
            return ['ok' => true, 'driver' => $driver];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }
}
