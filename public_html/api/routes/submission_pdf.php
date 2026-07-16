<?php
/**
 * GET /api/submission/pdf — Descarga la constancia del alumno (SIN nota).
 * Se genera al vuelo desde la ultima evaluacion registrada; NO se almacena.
 */
use MiaTech\Response;
use MiaTech\Database;
use MiaTech\Auth;
use MiaTech\Pdf;

$u = Auth::requireAuth();
if (($u['tipo'] ?? '') !== 'estudiante') {
    Response::error('Solo el alumno puede descargar su constancia', 403);
}
$ev = Database::get(
    'SELECT er.justificacion, er.transcripcion, er.periodo_academico,
            e.nombre, e.apellido, e.carrera, e.correo
     FROM evaluaciones_rendidas er JOIN estudiantes e ON e.id = er.estudiante_id
     WHERE er.estudiante_id = ? ORDER BY er.id DESC LIMIT 1',
    [$u['id']]
);
if (!$ev) {
    Response::error('No hay evaluacion registrada', 404);
}
$bytes = Pdf::constanciaAlumno([
    'nombre'        => $ev['nombre'],
    'apellido'      => $ev['apellido'],
    'carrera'       => $ev['carrera'],
    'correo'        => $ev['correo'],
    'periodo'       => $ev['periodo_academico'],
    'justificacion' => $ev['justificacion'],
    'transcripcion' => $ev['transcripcion'],
]);
$nombreArchivo = 'constancia_' . explode('@', $ev['correo'])[0] . '.pdf';
header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . $nombreArchivo . '"');
header('Content-Length: ' . strlen($bytes));
echo $bytes;
exit;
