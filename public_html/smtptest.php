<?php
/**
 * smtptest.php — PRUEBA TEMPORAL de SMTP vía navegador.
 * Uso:  https://institutoj20.sg-host.com/smtptest.php?key=miatech-smtp-2026&to=tucorreo@dominio.com
 *
 * ⚠️ BORRAR ESTE ARCHIVO DEL SERVIDOR una vez terminadas las pruebas de correo.
 *    Es un archivo de diagnostico; no debe quedar en produccion.
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=UTF-8');

// Clave simple para evitar que cualquiera dispare correos. Cambiable.
$CLAVE = 'miatech-smtp-2026';
if (($_GET['key'] ?? '') !== $CLAVE) {
    http_response_code(403);
    echo "Acceso denegado. Falta ?key= correcta.\n";
    exit;
}

require __DIR__ . '/api/bootstrap.php';

use MiaTech\Mailer;

$cfg = \config('smtp');
$destino = $_GET['to'] ?? ($cfg['user'] ?? '');

echo "== MiaTech · prueba SMTP (web) ==\n";
echo 'Host:     ' . ($cfg['host'] ?? '(vacio)') . "\n";
echo 'Puerto:   ' . ($cfg['port'] ?? '(vacio)') . "\n";
echo 'Usuario:  ' . ($cfg['user'] ?? '(vacio)') . "\n";
echo 'Password: ' . (empty($cfg['password']) ? '(VACIO)' : str_repeat('*', 4) . ' [' . strlen($cfg['password']) . ' chars]') . "\n";
echo 'From:     ' . ($cfg['from'] ?? '(vacio)') . "\n";
echo 'Destino:  ' . $destino . "\n";
echo "----------------------------------------\n";

if (empty($destino)) {
    echo "ERROR: sin correo destino. Agrega &to=correo@dominio.com a la URL.\n";
    exit;
}

$r = Mailer::enviar(
    $destino,
    'Prueba SMTP - MiaTech ' . date('H:i:s'),
    '<p>Correo de prueba enviado desde smtptest.php.</p>'
    . '<p>Si lo recibes, el SMTP funciona correctamente.</p>'
);

echo 'Resultado: ' . json_encode($r, JSON_UNESCAPED_UNICODE) . "\n";
echo "----------------------------------------\n";
echo (!empty($r['ok']))
    ? "OK — correo aceptado por el servidor. Revisa la bandeja de entrada (y SPAM).\n"
    : "FALLO — " . ($r['error'] ?? 'error desconocido') . "\n";
