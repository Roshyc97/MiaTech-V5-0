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
MiaTech\RateLimit::comprobar("login", 5, 300);

// 1) Administradores (roles): bcrypt
$admin = Database::get(
    'SELECT id, correo, nombre, password_hash, rol, activo, must_change_password, reset_token, reset_expira
     FROM administradores WHERE correo = ?',
    [$correo]
);
if ($admin) {
    if ((int) $admin['activo'] !== 1) {
        Response::error('Cuenta deshabilitada', 403);
    }

    // 1.a) Contrasena normal
    if (password_verify($password, $admin['password_hash'])) {
        $mcp = ((int) $admin['must_change_password'] === 1);
        Auth::login([
            'id' => (int) $admin['id'], 'correo' => $admin['correo'], 'nombre' => $admin['nombre'],
            'rol' => $admin['rol'], 'tipo' => 'admin', 'must_change_password' => $mcp,
        ]);
        Response::ok(['tipo' => 'admin', 'rol' => $admin['rol'], 'nombre' => $admin['nombre'], 'must_change_password' => $mcp]);
    }

    // 1.b) Contrasena temporal (recuperacion): valida si no ha caducado.
    // Al usarla, se convierte en la contrasena actual y se fuerza el cambio
    // (must_change_password = 1 -> "Pending"). Se consume (single-use).
    if (!empty($admin['reset_token'])
        && !empty($admin['reset_expira'])
        && strtotime($admin['reset_expira']) >= time()
        && password_verify($password, $admin['reset_token'])
    ) {
        Database::run(
            'UPDATE administradores
             SET password_hash = ?, must_change_password = 1, reset_token = NULL, reset_expira = NULL
             WHERE id = ?',
            [$admin['reset_token'], $admin['id']]
        );
        Auth::login([
            'id' => (int) $admin['id'], 'correo' => $admin['correo'], 'nombre' => $admin['nombre'],
            'rol' => $admin['rol'], 'tipo' => 'admin', 'must_change_password' => true,
        ]);
        Response::ok(['tipo' => 'admin', 'rol' => $admin['rol'], 'nombre' => $admin['nombre'], 'must_change_password' => true]);
    }

    Response::error('Credenciales incorrectas', 401);
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
// VALIDACIÓN: Período activo existe y no ha cerrado (fecha_fin)
$periodo_activo = Database::get(
    'SELECT id, fecha_fin FROM periodos WHERE activo = 1 LIMIT 1'
);
if (!$periodo_activo) {
    $registrar((int) $est['id'], 0);
    Response::error('No hay un periodo activo configurado', 503);
}
// Validar que la fecha_fin no haya pasado
if (!empty($periodo_activo['fecha_fin']) && time() > strtotime($periodo_activo['fecha_fin'] . ' 23:59:59')) {
    $registrar((int) $est['id'], 0);
    Response::error('El periodo de evaluacion ha cerrado', 403);
}

// Validar longitud de cédula: exactamente 10 caracteres
if (strlen($password) !== 10) {
    $registrar((int) $est['id'], 0);
    Response::error('Credenciales incorrectas', 401);
}
// Validar que la cédula coincida (texto plano)
if ((string) $est['cedula'] !== trim($password)) {
    $registrar((int) $est['id'], 0);
    Response::error('Credenciales incorrectas', 401);
}
// Verificar que NO haya completado evaluación en período activo
if ($periodo_activo) {
    $ya_intento = Database::get(
        'SELECT id FROM intentos_evaluacion WHERE estudiante_id = ? AND periodo_id = ?',
        [$est['id'], $periodo_activo['id']]
    );
    if ($ya_intento) {
        $registrar((int) $est['id'], 0);
        Response::error('You have already completed your evaluation for this period.', 403);
    }
}
$registrar((int) $est['id'], 1);
Auth::login([
    'id' => (int) $est['id'], 'correo' => $est['correo'], 'nombre' => $est['nombre'],
    'apellido' => $est['apellido'], 'carrera' => $est['carrera'], 'cedula' => $est['cedula'],
    'rol' => 'estudiante', 'tipo' => 'estudiante',
]);
Response::ok(['tipo' => 'estudiante', 'nombre' => $est['nombre'], 'correo' => $est['correo']]);
