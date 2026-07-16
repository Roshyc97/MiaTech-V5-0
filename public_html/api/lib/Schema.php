<?php
namespace MiaTech;

use PDO;

/**
 * Schema — crea las 11 tablas de MiaTech de forma driver-aware (MySQL / SQLite).
 * Portado del esquema Node (db/init.js) con las modificaciones acordadas:
 *   - estudiantes: + apellido, + carrera  (cedula = clave del alumno, texto plano)
 *   - administradores: + reset_token, + reset_expira (recuperacion solo para roles)
 */
class Schema
{
    public static function crear(PDO $pdo): void
    {
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $sqlite = ($driver === 'sqlite');

        $PK  = $sqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
        $NOW = $sqlite ? "DATETIME NOT NULL DEFAULT (datetime('now'))" : 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP';
        $INT = $sqlite ? 'INTEGER' : 'INT';
        $ENG = $sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';

        $stmts = [];

        $stmts[] = "CREATE TABLE IF NOT EXISTS configuracion (
            id $INT PRIMARY KEY,
            periodo_academico  VARCHAR(50)  NOT NULL,
            fecha_max          DATE         NOT NULL,
            storage_local_path VARCHAR(255) NOT NULL DEFAULT './storage'
        )$ENG";

        // cedula = clave de acceso del alumno (texto plano, visible en dashboard: por decision del usuario)
        $stmts[] = "CREATE TABLE IF NOT EXISTS estudiantes (
            id         $PK,
            correo     VARCHAR(255) NOT NULL UNIQUE,
            nombre     VARCHAR(255) NOT NULL,
            apellido   VARCHAR(255),
            carrera    VARCHAR(255),
            cedula     VARCHAR(50)  NOT NULL,
            activo     $INT NOT NULL DEFAULT 1,
            created_at $NOW
        )$ENG";

        $stmts[] = "CREATE TABLE IF NOT EXISTS administradores (
            id                   $PK,
            correo               VARCHAR(255) NOT NULL UNIQUE,
            password_hash        VARCHAR(255) NOT NULL,
            nombre               VARCHAR(255) NOT NULL,
            rol                  VARCHAR(20)  NOT NULL CHECK (rol IN ('ti','coordinador','docente')),
            activo               $INT NOT NULL DEFAULT 1,
            created_at           $NOW,
            created_by           $INT,
            must_change_password $INT NOT NULL DEFAULT 0,
            reset_token          VARCHAR(255),
            reset_expira         DATETIME
        )$ENG";

        $stmts[] = "CREATE TABLE IF NOT EXISTS intentos_login (
            id               $PK,
            estudiante_id    $INT,
            correo_ingresado VARCHAR(255) NOT NULL,
            exito            $INT NOT NULL DEFAULT 0,
            ip_address       VARCHAR(64),
            user_agent       VARCHAR(255),
            timestamp        $NOW
        )$ENG";

        $stmts[] = "CREATE TABLE IF NOT EXISTS evaluaciones_rendidas (
            id                 $PK,
            estudiante_id      $INT,
            periodo_academico  VARCHAR(50) NOT NULL,
            nivel_seleccionado VARCHAR(20) NOT NULL DEFAULT 'auto',
            resultado_cefr     VARCHAR(20) NOT NULL,
            justificacion      TEXT,
            transcripcion      TEXT,
            video_ref          VARCHAR(255),
            reporte_ref        VARCHAR(255),
            storage_driver     VARCHAR(20),
            timestamp          $NOW
        )$ENG";

        $stmts[] = "CREATE TABLE IF NOT EXISTS consentimientos (
            id            $PK,
            estudiante_id $INT,
            identificador VARCHAR(255) NOT NULL,
            acepto        $INT NOT NULL DEFAULT 0,
            timestamp     $NOW,
            texto_version VARCHAR(50) NOT NULL
        )$ENG";

        $stmts[] = "CREATE TABLE IF NOT EXISTS periodos (
            id           $PK,
            periodo      VARCHAR(50) NOT NULL UNIQUE,
            fecha_inicio DATE NOT NULL,
            fecha_fin    DATE NOT NULL,
            activo       $INT NOT NULL DEFAULT 1,
            created_at   $NOW
        )$ENG";

        $stmts[] = "CREATE TABLE IF NOT EXISTS docentes (
            id           $PK,
            correo       VARCHAR(255) NOT NULL UNIQUE,
            nombre       VARCHAR(255) NOT NULL,
            apellido     VARCHAR(255),
            especialidad VARCHAR(255),
            activo       $INT NOT NULL DEFAULT 1,
            created_at   $NOW
        )$ENG";

        $stmts[] = "CREATE TABLE IF NOT EXISTS estudiantes_periodos (
            id            $PK,
            estudiante_id $INT NOT NULL,
            periodo_id    $INT NOT NULL,
            asignado_en   $NOW,
            UNIQUE (estudiante_id, periodo_id)
        )$ENG";

        $stmts[] = "CREATE TABLE IF NOT EXISTS intentos_evaluacion (
            id             $PK,
            estudiante_id  $INT NOT NULL,
            periodo_id     $INT NOT NULL,
            fecha_intento  $NOW,
            resultado_cefr VARCHAR(20),
            duracion_seg   $INT
        )$ENG";

        $stmts[] = "CREATE TABLE IF NOT EXISTS importaciones (
            id                $PK,
            nombre_grupo      VARCHAR(255) NOT NULL,
            periodo_id        $INT NOT NULL,
            cantidad          $INT NOT NULL,
            importado_por     $INT,
            fecha_importacion $NOW
        )$ENG";

        foreach ($stmts as $sql) {
            $pdo->exec($sql);
        }

        // Fila unica de configuracion
        $existe = (int) $pdo->query('SELECT COUNT(*) FROM configuracion')->fetchColumn();
        if ($existe === 0) {
            $st = $pdo->prepare(
                'INSERT INTO configuracion (id, periodo_academico, fecha_max, storage_local_path)
                 VALUES (1, ?, ?, ?)'
            );
            $st->execute([
                \config('app.periodo_academico'),
                '2026-12-31',
                \config('storage.local_path'),
            ]);
        }
    }
}
