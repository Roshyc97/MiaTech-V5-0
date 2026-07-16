<?php
use MiaTech\Response;
// Configuracion publica para el frontend (sin API keys ni credenciales).
Response::ok([
    'siteName'         => getenv('SITE_NAME') ?: 'Mi@Tech',
    'minDuration'      => (int) \config('grabacion.min_seg'),
    'maxDuration'      => (int) \config('grabacion.max_seg'),
    'timeLabel'        => \config('grabacion.label'),
    'taskText'         => \config('grabacion.task_text'),
    'periodoAcademico' => \config('app.periodo_academico'),
]);
