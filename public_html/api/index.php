<?php
require __DIR__ . '/bootstrap.php';

use MiaTech\Response;

$uri    = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$ruta   = trim(preg_replace('#^.*?/api#', '', $uri), '/');
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$key    = "$metodo $ruta";

if (str_starts_with($ruta, 'admin/')) {
    require __DIR__ . '/routes/admin/dispatch.php';
    exit;
}

// PDF de profesor: /api/submission/pdf/{usuario}/profesor
if ($metodo === 'GET' && preg_match('#^submission/pdf/([^/]+)/profesor$#', $ruta)) {
    require __DIR__ . '/routes/submission_pdf_profesor.php';
    exit;
}

$rutas = [
    'GET health'                => 'health.php',
    'GET ajustes'               => 'config.php',
    'GET imagen/aleatoria'      => 'imagen.php',
    'POST consentimiento'       => 'consentimiento.php',
    'POST submission'           => 'submission.php',
    'GET submission/pdf'        => 'submission_pdf.php',
    'POST auth/login'           => 'auth/login.php',
    'POST auth/logout'          => 'auth/logout.php',
    'GET auth/me'               => 'auth/me.php',
    'POST auth/change-password' => 'auth/change-password.php',
    'POST auth/forgot'          => 'auth/forgot.php',
    'POST auth/reset'           => 'auth/reset.php',
];

if (isset($rutas[$key])) {
    require __DIR__ . '/routes/' . $rutas[$key];
    exit;
}

Response::error("Ruta no encontrada: /$ruta", 404);
