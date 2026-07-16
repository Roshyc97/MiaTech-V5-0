<?php
use MiaTech\Response;
use MiaTech\Request;
use MiaTech\Database;
use MiaTech\Auth;

$u = Auth::requireAdmin(); // solo roles
$actual = (string) Request::input('password_actual', '');
$nueva  = (string) Request::input('password_nueva', '');
if ($actual === '' || $nueva === '') {
    Response::error('Se requieren ambas contrasenas', 400);
}
if (strlen($nueva) < 8) {
    Response::error('La contrasena nueva debe tener al menos 8 caracteres', 400);
}
$admin = Database::get('SELECT password_hash FROM administradores WHERE id = ?', [$u['id']]);
if (!$admin || !password_verify($actual, $admin['password_hash'])) {
    Response::error('Contrasena actual incorrecta', 401);
}
Database::run(
    'UPDATE administradores SET password_hash = ?, must_change_password = 0 WHERE id = ?',
    [password_hash($nueva, PASSWORD_BCRYPT), $u['id']]
);
$_SESSION['usuario']['must_change_password'] = false;
Response::ok();
