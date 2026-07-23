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
use MiaTech\EmailTemplates;
use MiaTech\Storage\StorageFactory;

$u = Auth::requireAuth();
if (($u['tipo'] ?? '') !== 'estudiante') {
    Response::error('Solo estudiantes pueden enviar evaluaciones', 403);
}

// Periodo activo: OPCIÓN A — leer desde periodos.activo=1 (fuente única de verdad)
$periodo = Database::get('SELECT id, periodo FROM periodos WHERE activo = 1 LIMIT 1');
if (!$periodo) {
    Response::error('No hay un periodo activo configurado', 503);
}
$periodoId = $periodo['id'];
$periodoNombre = $periodo['periodo'];

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

    // 5) Generar AMBOS PDFs (profesor + alumno)
    // PDF profesor: se almacena permanentemente (respaldo)
    // PDF alumno: se sirve en memoria (descarga inmediata, se pierde si no descarga)
    $storage = StorageFactory::crear();
    $pdfProfBytes = Pdf::evaluacionProfesor($datos);
    $pdfAlumBytes = Pdf::constanciaAlumno($datos);

    // Almacenar SOLO PDF profesor
    $tmpPdf = $tmpDir . '/' . $usuario . '_evaluacion.pdf';
    file_put_contents($tmpPdf, $pdfProfBytes);

    $videoKey = "$periodoNombre/videos/$usuario.webm";
    $pdfKey   = "$periodoNombre/pdf/{$usuario}_evaluacion.pdf";
    $storage->guardar($videoKey, $tmpVideo);
    $storage->guardar($pdfKey, $tmpPdf);
    @unlink($tmpPdf);

    // 6) Registrar resultado + candado
    // NOTA: justificacion y transcripcion NO se almacenan en BD
    // Solo existen en el PDF profesor (storage/) como respaldo permanente
    Database::run(
        'INSERT INTO evaluaciones_rendidas
         (estudiante_id, periodo_academico, nivel_seleccionado, resultado_cefr, video_ref, reporte_ref, storage_driver)
         VALUES (?,?,?,?,?,?,?)',
        [$u['id'], $periodoNombre, 'auto', $eval['nivel_cefr'], $videoKey, $pdfKey, $storage->nombre()]
    );

    // Actualizar estadísticas del período
    $nivel = $eval['nivel_cefr'];
    $colNivel = match($nivel) {
        'A1' => 'nivel_a1',
        'A2.1' => 'nivel_a2_1',
        'A2.2' => 'nivel_a2_2',
        'B1' => 'nivel_b1',
        default => null
    };
    if ($colNivel) {
        Database::run(
            "UPDATE estadisticas_periodos SET
                total_evaluaciones = total_evaluaciones + 1,
                $colNivel = $colNivel + 1,
                updated_at = CURRENT_TIMESTAMP
             WHERE periodo = ?",
            [$periodoNombre]
        );
    }

    if ($periodoId) {
        Database::run(
            'INSERT INTO intentos_evaluacion (estudiante_id, periodo_id, resultado_cefr) VALUES (?,?,?)',
            [$u['id'], $periodoId, $eval['nivel_cefr']]
        );
        // CAMBIO 4: Incrementar caché de intentos en tabla estudiantes
        Database::run(
            'UPDATE estudiantes SET intentos_evaluacion_count = intentos_evaluacion_count + 1 WHERE id = ?',
            [$u['id']]
        );
    }

    // 7) Correo de confirmacion al alumno (best-effort, sin calificacion)
    // Plantilla HTML vive en lib/EmailTemplates.php — para cambios de formato
    // o contenido del correo, editar UNICAMENTE ese archivo.
    $nombreCompleto = trim(($est['nombre'] ?? '') . ' ' . ($est['apellido'] ?? ''));
    Mailer::enviar(
        $u['correo'],
        'Confirmacion de envio - Speaking Test | Centro de Idiomas ITS Japon',
        EmailTemplates::confirmacionAlumno([
            'nombre'  => $nombreCompleto,
            'fecha'   => $datos['fecha'],
            'periodo' => $periodoNombre,
        ])
    );

    // 8) Almacenar PDF alumno en sesión (para descarga inmediata SOLO)
    $_SESSION['pdf_alumno_descarga'] = $pdfAlumBytes;

    // 9) Limpieza (audio y video temporales; el PDF del alumno no se almacena)
    @unlink($audio);
    @unlink($tmpVideo);

    Response::ok(['pdf_url' => '/api/submission/pdf']);
} catch (\Throwable $e) {
    if ($audio) @unlink($audio);
    @unlink($tmpVideo);
    Response::error('Error procesando la evaluacion: ' . $e->getMessage(), 500);
}
