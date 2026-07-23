<?php
use MiaTech\Response;
use MiaTech\Request;
use MiaTech\Database;
use MiaTech\Mailer;
use MiaTech\EmailTemplates;

// Recuperacion SOLO para roles (administradores). Estudiantes NO tienen recuperacion.
// Flujo: se genera una CONTRASENA TEMPORAL, se guarda su hash (bcrypt) en reset_token
// con caducidad de 1h (reset_expira). NO se toca la contrasena actual hasta que el
// admin inicie sesion con la temporal (ver login.php). Al usarla se le obliga a
// cambiarla (must_change_password = 1 -> estado "Pending" en el dashboard).
$correo = strtolower(trim((string) Request::input('correo', '')));
if ($correo === '') {
    Response::error('Correo requerido', 400);
}
MiaTech\RateLimit::comprobar('forgot', 6, 600);
$generico = ['mensaje' => 'Si el correo corresponde a un usuario con rol, se envio una contrasena temporal.'];

$admin = Database::get('SELECT id, correo, nombre FROM administradores WHERE correo = ? AND activo = 1', [$correo]);
if (!$admin) {
    Response::ok($generico); // no revelar existencia de la cuenta
}

// Contrasena temporal legible (10 chars, sin caracteres ambiguos)
$alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
$tempPlano = '';
for ($i = 0; $i < 10; $i++) {
    $tempPlano .= $alfabeto[random_int(0, strlen($alfabeto) - 1)];
}

$hashTemp = password_hash($tempPlano, PASSWORD_BCRYPT);
$expira   = date('Y-m-d H:i:s', time() + 3600); // 1 hora

// Se guarda el hash de la temporal en reset_token; la contrasena actual queda intacta.
Database::run(
    'UPDATE administradores SET reset_token = ?, reset_expira = ? WHERE id = ?',
    [$hashTemp, $expira, $admin['id']]
);

$env = Mailer::enviar(
    $correo,
    'Contrasena temporal - MiaTech Administracion',
    EmailTemplates::recuperacionAdmin([
        'nombre'    => $admin['nombre'] ?? '',
        'temporal'  => $tempPlano,
        'caducidad' => '1 hora',
    ])
);

if (\config('app.debug')) {
    $generico['enviado'] = $env['ok'] ?? false;
    if (empty($env['ok'])) $generico['smtp'] = $env['error'] ?? '';
}
Response::ok($generico);
