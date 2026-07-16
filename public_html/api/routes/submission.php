<?php
/**
 * POST /api/submission — flujo completo de evaluacion.
 * multipart: video (archivo), imagen_id.
 * Orquesta: guardar video -> ffmpeg audio -> Whisper -> LLM -> PDF profesor ->
 * almacenar (video + pdf profesor) -> registrar + candado 1 intento -> correo -> respuesta.
 * NO devuelve calificacion. El PDF del alumno (sin nota) se descarga aparte y no se almacena.
 */
use MiaTech\Response;
use MiaTech\Request;
use MiaTech\Database;
use MiaTech\Auth;
use MiaTech\Ffmpeg;
use MiaTech\Groq;
use MiaTech\Pdf;
use MiaTech\Mailer;
use MiaTech\Storage\StorageFactory;

$u = Auth::requireAuth();
if (($u['tipo'] ?? '') !== 'estudiante') {
    Response::error('Solo estudiantes pueden enviar evaluaciones', 403);
}

// Periodo activo
$periodoNombre = \config('app.periodo_academico');
$periodo = Database::get('SELECT id FROM periodos WHERE periodo = ?', [$periodoNombre]);
$periodoId = $periodo['id'] ?? null;

// Candado: 1 intento por alumno por periodo
if ($periodoId) {
    $ya = Database::get(
        'SELECT id FROM intentos_evaluacion WHERE estudiante_id = ? AND periodo_id = ?',
        [$u['id'], $periodoId]
    );
    if ($ya) {
        Response::error('Ya rendiste tu evaluacion en este periodo. No es posible un segundo intento.', 403);
    }
}

// Validar archivo
if (empty($_FILES['video']['tmp_name']) || $_FILES['video']['error'] !== UPLOAD_ERR_OK) {
    Response::error('No se recibio el video', 400);
}
$usuario = explode('@', $u['correo'])[0];               // correo sin dominio
$tmpDir  = rtrim(\config('storage.local_path'), '/') . '/tmp';
@mkdir($tmpDir, 0775, true);
$tmpVideo = $tmpDir . '/' . $usuario . '_' . time() . '.webm';
if (!move_uploaded_file($_FILES['video']['tmp_name'], $tmpVideo)) {
    // fallback para entornos de prueba (no multipart real)
    @copy($_FILES['video']['tmp_name'], $tmpVideo);
}

$audio = null;
try {
    // 1) Audio con ffmpeg
    $audio = Ffmpeg::extraerAudio($tmpVideo);
    // 2) Transcribir
    $transcripcion = Groq::transcribir($audio);
    // 3) Evaluar
    $eval = Groq::evaluar($transcripcion);

    // 4) Datos del estudiante
    $est = Database::get('SELECT nombre, apellido, carrera, correo FROM estudiantes WHERE id = ?', [$u['id']]);
    $datos = array_merge($est ?: [], [
        'periodo'       => $periodoNombre,
        'fecha'         => date('Y-m-d H:i'),
        'transcripcion' => $transcripcion,
        'justificacion' => $eval['justificacion'],
        'nivel_cefr'    => $eval['nivel_cefr'],
        'confianza'     => $eval['confianza'],
    ]);

    // 5) PDF profesor (con nota) -> almacenar; video -> almacenar
    $storage = StorageFactory::crear();
    $pdfProfBytes = Pdf::evaluacionProfesor($datos);
    $tmpPdf = $tmpDir . '/' . $usuario . '_profesor.pdf';
    file_put_contents($tmpPdf, $pdfProfBytes);

    $videoKey = "$periodoNombre/videos/$usuario.webm";
    $pdfKey   = "$periodoNombre/pdf/{$usuario}_profesor.pdf";
    $storage->guardar($videoKey, $tmpVideo);
    $storage->guardar($pdfKey, $tmpPdf);
    @unlink($tmpPdf);

    // 6) Registrar resultado + candado
    Database::run(
        'INSERT INTO evaluaciones_rendidas
         (estudiante_id, periodo_academico, nivel_seleccionado, resultado_cefr, justificacion, transcripcion, video_ref, reporte_ref, storage_driver)
         VALUES (?,?,?,?,?,?,?,?,?)',
        [$u['id'], $periodoNombre, 'auto', $eval['nivel_cefr'], $eval['justificacion'], $transcripcion, $videoKey, $pdfKey, $storage->nombre()]
    );
    if ($periodoId) {
        Database::run(
            'INSERT INTO intentos_evaluacion (estudiante_id, periodo_id, resultado_cefr) VALUES (?,?,?)',
            [$u['id'], $periodoId, $eval['nivel_cefr']]
        );
    }

    // 7) Correo de confirmacion al alumno (best-effort, sin calificacion)
    $nombreCompleto = trim(($est['nombre'] ?? '') . ' ' . ($est['apellido'] ?? ''));
    Mailer::enviar(
        $u['correo'],
        'Confirmacion de evaluacion - MiaTech',
        '<p>Hola ' . htmlspecialchars($nombreCompleto) . ',</p>'
        . '<p>Tu evaluacion oral fue recibida y procesada correctamente. '
        . 'El resultado se ha enviado a tu instructor. Gracias por participar.</p>'
    );

    // 8) Limpieza (audio y video temporales; el PDF del alumno no se almacena)
    @unlink($audio);
    @unlink($tmpVideo);

    Response::ok(['pdf_url' => '/api/submission/pdf']);
} catch (\Throwable $e) {
    if ($audio) @unlink($audio);
    @unlink($tmpVideo);
    Response::error('Error procesando la evaluacion: ' . $e->getMessage(), 500);
}
