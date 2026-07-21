<?php
namespace MiaTech;

use PDO;

/**
 * Seed — datos de prueba (solo desarrollo). Portado de db/auto-init.js + seed.js.
 * Idempotente: no duplica si ya existe (verifica por correo/periodo).
 */
class Seed
{
    private const ESTUDIANTES = [
        ['cavasconezp@itsjapon.edu.ec', 'Cesar Andres',   'Vasconez Pastor',   'Desarrollo de Software', '1712345678'],
        ['malopezg@itsjapon.edu.ec',    'Maria Alejandra', 'Lopez Guerrero',   'Enfermeria',             '1723456789'],
        ['jumorenor@itsjapon.edu.ec',   'Juan Pablo',      'Moreno Ramos',     'Gastronomia',            '1734567890'],
        ['sajimenezc@itsjapon.edu.ec',  'Sandra Patricia', 'Jimenez Castro',   'Desarrollo de Software', '1745678901'],
        ['catorrest@itsjapon.edu.ec',   'Carlos Alberto',  'Torres Torres',    'Marketing',              '1756789012'],
        ['anriverav@itsjapon.edu.ec',   'Ana Lucia',       'Rivera Vega',      'Enfermeria',             '1767890123'],
        ['lurojasp@itsjapon.edu.ec',    'Luis Fernando',   'Rojas Pinto',      'Gastronomia',            '1778901234'],
        ['gacortezm@itsjapon.edu.ec',   'Gabriela Sofia',  'Cortez Mendoza',   'Marketing',              '1789012345'],
        ['difloresq@itsjapon.edu.ec',   'Diego Esteban',   'Flores Quiroz',    'Desarrollo de Software', '1790123456'],
        ['pamunozo@itsjapon.edu.ec',    'Patricia Elena',  'Munoz Ortega',     'Enfermeria',             '1701234567'],
    ];

    // Contrasenas en claro (se hashean con bcrypt al insertar). Solo pruebas.
    private const ADMINS = [
        ['admin.ti@itsjapon.edu.ec',            'admin1234',   'Administrador TI',              'ti'],
        ['coordinador.idiomas@itsjapon.edu.ec', 'coord1234',   'Coordinador Centro de Idiomas', 'coordinador'],
        ['docente.ingles@itsjapon.edu.ec',      'docente1234', 'Docente Ingles',                'docente'],
    ];

    // Docentes eliminados: ahora son administradores con rol='docente'

    private const PERIODOS = [
        ['2025A', '2025-01-01', '2025-06-30'],
        ['2025B', '2025-07-01', '2025-12-31'],
        ['2026A', '2026-01-01', '2026-06-30'],
    ];

    public static function ejecutar(): array
    {
        $pdo = Database::conn();
        $res = ['estudiantes' => 0, 'administradores' => 0, 'periodos' => 0];

        foreach (self::ESTUDIANTES as [$correo, $nombre, $apellido, $carrera, $cedula]) {
            if (!Database::get('SELECT id FROM estudiantes WHERE correo = ?', [$correo])) {
                Database::run(
                    'INSERT INTO estudiantes (correo, nombre, apellido, carrera, cedula) VALUES (?,?,?,?,?)',
                    [$correo, $nombre, $apellido, $carrera, $cedula]
                );
                $res['estudiantes']++;
            }
        }

        foreach (self::ADMINS as [$correo, $pass, $nombre, $rol]) {
            if (!Database::get('SELECT id FROM administradores WHERE correo = ?', [$correo])) {
                Database::run(
                    'INSERT INTO administradores (correo, password_hash, nombre, rol, must_change_password)
                     VALUES (?,?,?,?,1)',
                    [$correo, password_hash($pass, PASSWORD_BCRYPT), $nombre, $rol]
                );
                $res['administradores']++;
            }
        }

        // OPCIÓN A: Solo activar el período actual (configuración), otros inactivos
        $periodoActualConfig = \config('app.periodo_academico');
        foreach (self::PERIODOS as [$periodo, $ini, $fin]) {
            if (!Database::get('SELECT id FROM periodos WHERE periodo = ?', [$periodo])) {
                $esActivo = ($periodo === $periodoActualConfig) ? 1 : 0;  // Solo UNO activo
                Database::run(
                    'INSERT INTO periodos (periodo, fecha_inicio, fecha_fin, activo) VALUES (?,?,?,?)',
                    [$periodo, $ini, $fin, $esActivo]
                );
                $res['periodos']++;
            }
        }

        // Asignar todos los estudiantes al periodo activo (config)
        $periodoActivo = \config('app.periodo_academico');
        $pRow = Database::get('SELECT id FROM periodos WHERE periodo = ?', [$periodoActivo]);
        if ($pRow) {
            Database::run(
                'UPDATE estudiantes SET periodo_id = ? WHERE periodo_id IS NULL',
                [$pRow['id']]
            );
        }

        return $res;
    }
}
