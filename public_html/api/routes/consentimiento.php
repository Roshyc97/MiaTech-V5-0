<?php
use MiaTech\Response;
use MiaTech\Request;
use MiaTech\Database;
use MiaTech\Auth;

$u = Auth::requireAuth();
if (($u['tipo'] ?? '') !== 'estudiante') {
    Response::error('Solo estudiantes pueden registrar consentimiento', 403);
}
$acepto = Request::input('acepto', null);
$version = trim((string) Request::input('texto_version', ''));
if ($acepto === null) {
    Response::error('El campo "acepto" es requerido (1 = acepta, 0 = rechaza)', 400);
}
if ($version === '') {
    Response::error('El campo "texto_version" es requerido', 400);
}
$aceptoNorm = $acepto ? 1 : 0;
Database::run(
    'INSERT INTO consentimientos (estudiante_id, identificador, acepto, texto_version) VALUES (?,?,?,?)',
    [$u['id'], $u['correo'], $aceptoNorm, $version]
);
Response::ok(['acepto' => $aceptoNorm]);
