<?php
/** GET /api/submission/pdf/{usuario}/profesor — PDF con nota. Solo roles. */
use MiaTech\Response;
use MiaTech\Database;
use MiaTech\Auth;
use MiaTech\Storage\StorageFactory;

Auth::requireAdmin();
preg_match('#^submission/pdf/([^/]+)/profesor$#', $ruta, $mm);
$usuario = $mm[1] ?? '';
$correo = $usuario . '@itsjapon.edu.ec';
$ev = Database::get(
    'SELECT er.reporte_ref, er.storage_driver FROM evaluaciones_rendidas er
     JOIN estudiantes e ON e.id = er.estudiante_id
     WHERE e.correo = ? ORDER BY er.id DESC LIMIT 1',
    [$correo]
);
if (!$ev || empty($ev['reporte_ref'])) {
    Response::error('No hay reporte para ese usuario', 404);
}
try {
    $bytes = StorageFactory::crear()->leer($ev['reporte_ref']);
} catch (\Throwable $e) {
    Response::error('No se pudo leer el reporte: ' . $e->getMessage(), 404);
}
header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . $usuario . '_evaluacion.pdf"');
header('Content-Length: ' . strlen($bytes));
echo $bytes;
exit;
