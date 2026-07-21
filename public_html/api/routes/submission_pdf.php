<?php
/**
 * GET /api/submission/pdf — Descarga la constancia del alumno (SIN nota).
 * SOLO disponible inmediatamente después de la evaluación (en la sesión).
 * Si se intenta descargar después → Error (PDF expirado).
 */
use MiaTech\Response;
use MiaTech\Auth;

$u = Auth::requireAuth();
if (($u['tipo'] ?? '') !== 'estudiante') {
    Response::error('Solo el alumno puede descargar su constancia', 403);
}

// Verificar si el PDF está disponible en sesión (descarga inmediata SOLO)
if (!isset($_SESSION['pdf_alumno_descarga'])) {
    Response::error('La constancia solo está disponible inmediatamente después de la evaluación. Por favor, descárguela antes de salir de esta pantalla.', 410);
}

// Obtener PDF y eliminarlo de sesión (una descarga únicamente)
$bytes = $_SESSION['pdf_alumno_descarga'];
unset($_SESSION['pdf_alumno_descarga']);

// Servir al navegador
header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="constancia_alumno.pdf"');
header('Content-Length: ' . strlen($bytes));
echo $bytes;
exit;
