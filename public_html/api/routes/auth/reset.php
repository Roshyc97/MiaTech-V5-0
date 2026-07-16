<?php
use MiaTech\Response;
use MiaTech\Request;
use MiaTech\Database;

$correo = strtolower(trim((string) Request::input('correo', '')));
$token  = (string) Request::input('token', '');
$nueva  = (string) Request::input('password_nueva', '');
if ($correo === '' || $token === '' || $nueva === '') {
    Response::error('Datos incompletos', 400);
}
if (strlen($nueva) < 8) {
    Response::error('La contrasena debe tener al menos 8 caracteres', 400);
}
$admin = Database::get('SELECT id, reset_token, reset_expira FROM administradores WHERE correo = ? AND activo = 1', [$correo]);
if (!$admin || empty($admin['reset_token'])) {
    Response::error('Token invalido', 400);
}
if (!hash_equals($admin['reset_token'], hash('sha256', $token))) {
    Response::error('Token invalido', 400);
}
if (strtotime($admin['reset_expira']) < time()) {
    Response::error('Token expirado', 400);
}
Database::run(
    'UPDATE administradores SET password_hash = ?, must_change_password = 0, reset_token = NULL, reset_expira = NULL WHERE id = ?',
    [password_hash($nueva, PASSWORD_BCRYPT), $admin['id']]
);
Response::ok(['mensaje' => 'Contrasena actualizada']);
