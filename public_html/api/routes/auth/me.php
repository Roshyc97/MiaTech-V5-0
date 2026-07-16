<?php
use MiaTech\Response;
use MiaTech\Auth;
$u = Auth::requireAuth();
$out = ['id' => $u['id'], 'correo' => $u['correo'], 'nombre' => $u['nombre'], 'rol' => $u['rol'], 'tipo' => $u['tipo']];
if (array_key_exists('must_change_password', $u)) {
    $out['must_change_password'] = $u['must_change_password'];
}
Response::ok($out);
