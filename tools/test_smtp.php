<?php
/**
 * tools/test_smtp.php — Prueba aislada del envio SMTP (CLI).
 * Uso:  php tools/test_smtp.php [correo_destino]
 * Si no se pasa destino, envia al propio SMTP_USER.
 * Imprime la configuracion (contrasena enmascarada) y el resultado/error real
 * del servidor, para diagnosticar sin correr una evaluacion completa.
 */
require __DIR__ . '/../public_html/api/bootstrap.php';

use MiaTech\Mailer;

$cfg = \config('smtp');
$destino = $argv[1] ?? ($cfg['user'] ?? '');

fwrite(STDOUT, "== MiaTech · prueba SMTP ==\n");
fwrite(STDOUT, 'Host:     ' . ($cfg['host'] ?? '(vacio)') . "\n");
fwrite(STDOUT, 'Puerto:   ' . ($cfg['port'] ?? '(vacio)') . "\n");
fwrite(STDOUT, 'Usuario:  ' . ($cfg['user'] ?? '(vacio)') . "\n");
fwrite(STDOUT, 'Password: ' . (empty($cfg['password']) ? '(VACIO)' : str_repeat('*', 4) . ' [' . strlen($cfg['password']) . ' chars]') . "\n");
fwrite(STDOUT, 'From:     ' . ($cfg['from'] ?? '(vacio)') . "\n");
fwrite(STDOUT, 'Destino:  ' . $destino . "\n");
fwrite(STDOUT, "----------------------------------------\n");

if (empty($destino)) {
    fwrite(STDERR, "ERROR: sin correo destino y SMTP_USER vacio.\n");
    exit(1);
}

$r = Mailer::enviar(
    $destino,
    'Prueba SMTP - MiaTech ' . date('H:i:s'),
    '<p>Correo de prueba enviado desde tools/test_smtp.php.</p>'
    . '<p>Si lo recibes, el SMTP funciona correctamente.</p>'
);

fwrite(STDOUT, 'Resultado: ' . json_encode($r, JSON_UNESCAPED_UNICODE) . "\n");

if (!empty($r['ok'])) {
    fwrite(STDOUT, "OK — correo aceptado por el servidor. Revisa la bandeja de entrada.\n");
    exit(0);
}
fwrite(STDERR, "FALLO — " . ($r['error'] ?? 'error desconocido') . "\n");
exit(1);
