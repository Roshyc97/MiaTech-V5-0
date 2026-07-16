<?php
use MiaTech\Response;
use MiaTech\Request;
use MiaTech\Database;
use MiaTech\Auth;

$correo   = strtolower(trim((string) Request::input('correo', '')));
$password = (string) Request::input('password', '');
if ($correo === '' || $password === '') {
    Response::error('Correo y contrasena son requeridos', 400);
}
$ip = Request::ip();
$ua = Request::userAgent();
MiaTech\RateLimit::comprobar("login", 12, 300);

// 1) Administradores (roles): bcrypt
$admin = Database::get(
    'SELECT id, correo, nombre, password_hash, rol, activo, must_change_password
     FROM administradores WHERE correo = ?',
    [$correo]
);
if ($admin) {
    if ((int) $admin['activo'] !== 1) {
        Response::error('Cuenta deshabilitada', 403);
    }
    if (!password_verify($password, $admin['password_hash'])) {
        Response::error('Credenciales incorrectas', 401);
    }
    $mcp = ((int) $admin['must_change_password'] === 1);
    Auth::login([
        'id' => (int) $admin['id'], 'correo' => $admin['correo'], 'nombre' => $admin['nombre'],
        'rol' => $admin['rol'], 'tipo' => 'admin', 'must_change_password' => $mcp,
    ]);
    Response::ok(['tipo' => 'admin', 'rol' => $admin['rol'], 'nombre' => $admin['nombre'], 'must_change_password' => $mcp]);
}

// 2) Estudiantes: clave = cedula (texto plano)
$est = Database::get(
    'SELECT id, correo, nombre, apellido, carrera, cedula, activo FROM estudiantes WHERE correo = ?',
    [$correo]
);
$registrar = function (?int $eid, int $exito) use ($correo, $ip, $ua) {
    Database::run(
        'INSERT INTO intentos_login (estudiante_id, correo_ingresado, exito, ip_address, user_agent)
         VALUES (?,?,?,?,?)',
        [$eid, $correo, $exito, $ip, $ua]
    );
};

if (!$est) {
    $registrar(null, 0);
    Response::error('Credenciales incorrectas', 401);
}
if ((int) $est['activo'] !== 1) {
    $registrar((int) $est['id'], 0);
    Response::error('Cuenta deshabilitada', 403);
}
$cfg = Database::get('SELECT fecha_max FROM configuracion LIMIT 1');
if ($cfg && !empty($cfg['fecha_max']) && time() > strtotime($cfg['fecha_max'] . ' 23:59:59')) {
    $registrar((int) $est['id'], 0);
    Response::error('El periodo de evaluacion ha cerrado', 403);
}
if ((string) $est['cedula'] !== trim($password)) {
    $registrar((int) $est['id'], 0);
    Response::error('Credenciales incorrectas', 401);
}
$registrar((int) $est['id'], 1);
Auth::login([
    'id' => (int) $est['id'], 'correo' => $est['correo'], 'nombre' => $est['nombre'],
    'apellido' => $est['apellido'], 'carrera' => $est['carrera'], 'cedula' => $est['cedula'],
    'rol' => 'estudiante', 'tipo' => 'estudiante',
]);
Response::ok(['tipo' => 'estudiante', 'nombre' => $est['nombre'], 'correo' => $est['correo']]);
