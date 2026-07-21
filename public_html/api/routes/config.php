<?php
use MiaTech\Response;
use MiaTech\Database;

// Configuracion publica para el frontend (sin API keys ni credenciales).
// OPCIÓN A: Leer período activo desde BD (periodos.activo=1) en lugar de config
$periodoActivo = Database::get('SELECT periodo FROM periodos WHERE activo = 1 LIMIT 1');
$periodoAcademico = $periodoActivo['periodo'] ?? \config('app.periodo_academico');

Response::ok([
    'siteName'         => getenv('SITE_NAME') ?: 'Mi@Tech',
    'minDuration'      => (int) \config('grabacion.min_seg'),
    'maxDuration'      => (int) \config('grabacion.max_seg'),
    'timeLabel'        => \config('grabacion.label'),
    'taskText'         => \config('grabacion.task_text'),
    'periodoAcademico' => $periodoAcademico,
]);
