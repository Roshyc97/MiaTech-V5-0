<?php
/**
 * dispatch.php — Sub-router del panel admin. Requiere sesion admin.
 * $ruta viene como "admin/....". Se enruta por metodo + subruta (con IDs).
 */
use MiaTech\Response;
use MiaTech\Request;
use MiaTech\Database;
use MiaTech\Auth;

$u   = Auth::requireAdmin();
$sub = substr($ruta, strlen('admin/'));          // ej: "estudiantes/5"
$m   = $metodo;

/** Helper: exige uno de los roles. */
$rol = function (array $roles) use ($u) {
    if (!in_array($u['rol'] ?? '', $roles, true)) {
        Response::error('No tienes permisos para esta accion', 403);
    }
};

// ============ ESTADISTICAS ============
if ($m === 'GET' && $sub === 'estadisticas') {
    $total = (int) (Database::get('SELECT COUNT(*) c FROM evaluaciones_rendidas')['c'] ?? 0);
    $porNivel = [];
    foreach (['A1', 'A2.1', 'A2.2', 'B1'] as $n) {
        $porNivel[$n] = (int) (Database::get('SELECT COUNT(*) c FROM evaluaciones_rendidas WHERE resultado_cefr = ?', [$n])['c'] ?? 0);
    }
    $porPeriodo = Database::all(
        'SELECT periodo_academico AS periodo, COUNT(*) AS cantidad
         FROM evaluaciones_rendidas GROUP BY periodo_academico ORDER BY periodo_academico'
    );
    Response::ok([
        'total_evaluaciones'   => $total,
        'por_nivel'            => $porNivel,
        'por_periodo'          => $porPeriodo,
        'total_estudiantes'    => (int) (Database::get('SELECT COUNT(*) c FROM estudiantes')['c'] ?? 0),
        'total_consentimientos'=> (int) (Database::get('SELECT COUNT(*) c FROM consentimientos WHERE acepto = 1')['c'] ?? 0),
        'total_accesos'        => (int) (Database::get('SELECT COUNT(*) c FROM intentos_login WHERE exito = 1')['c'] ?? 0),
    ]);
}

// ============ ESTUDIANTES ============
if ($sub === 'estudiantes' && $m === 'GET') {
    // Paginacion + busqueda + filtro por estado (esperado por public_html/js/admin-sections/estudiantes.js)
    $paginaEst  = max(1, (int) Request::input('page', 1));
    $limiteEst  = max(1, min(100, (int) Request::input('limit', 20)));
    $filtroEst  = (string) Request::input('filtro', 'todos'); // activos | inactivos | todos
    $buscarEst  = trim((string) Request::input('search', ''));

    $condicionesEst = [];
    $paramsEst = [];
    if ($filtroEst === 'activos') {
        $condicionesEst[] = 'e.activo = 1';
    } elseif ($filtroEst === 'inactivos') {
        $condicionesEst[] = 'e.activo = 0';
    }
    if ($buscarEst !== '') {
        $condicionesEst[] = '(e.correo LIKE ? OR e.nombre LIKE ? OR e.apellido LIKE ?)';
        $comodinEst = '%' . $buscarEst . '%';
        array_push($paramsEst, $comodinEst, $comodinEst, $comodinEst);
    }
    $whereEst = $condicionesEst ? ('WHERE ' . implode(' AND ', $condicionesEst)) : '';

    $totalEst = (int) (Database::get("SELECT COUNT(*) c FROM estudiantes e $whereEst", $paramsEst)['c'] ?? 0);
    $totalPaginasEst = max(1, (int) ceil($totalEst / $limiteEst));
    $offsetEst = ($paginaEst - 1) * $limiteEst;

    $rows = Database::all(
        "SELECT e.id, e.correo, e.nombre, e.apellido, e.carrera, e.cedula, e.activo, e.created_at,
            (SELECT p.periodo FROM estudiantes_periodos ep JOIN periodos p ON p.id = ep.periodo_id
                WHERE ep.estudiante_id = e.id ORDER BY ep.id DESC LIMIT 1) AS periodo,
            (SELECT COUNT(*) FROM consentimientos c WHERE c.identificador = e.correo AND c.acepto = 1) AS consintio,
            (SELECT er.resultado_cefr FROM evaluaciones_rendidas er WHERE er.estudiante_id = e.id
                ORDER BY er.id DESC LIMIT 1) AS nivel,
            (SELECT COUNT(*) FROM intentos_login il WHERE il.estudiante_id = e.id AND il.exito = 1) AS accesos,
            (SELECT COUNT(*) FROM intentos_evaluacion ie WHERE ie.estudiante_id = e.id) AS intentos_count
         FROM estudiantes e $whereEst ORDER BY e.nombre LIMIT $limiteEst OFFSET $offsetEst",
        $paramsEst
    );
    foreach ($rows as &$r) {
        $r['consentimiento'] = ((int) $r['consintio'] > 0) ? 'si' : 'no';
        $r['clave'] = $r['cedula']; // clave del alumno = cedula (texto plano, decision del usuario)
        $r['intentos_count'] = (int) $r['intentos_count'];
    }
    unset($r);
    Response::ok([
        'estudiantes'    => $rows,
        'total'          => $totalEst,
        'pagina'         => $paginaEst,
        'total_paginas'  => $totalPaginasEst,
        'limit'          => $limiteEst,
    ]);
}

if ($sub === 'estudiantes' && $m === 'POST') {
    $rol(['ti', 'coordinador']);
    $correo = strtolower(trim((string) Request::input('correo', '')));
    $nombre = trim((string) Request::input('nombre', ''));
    $apellido = trim((string) Request::input('apellido', ''));
    $carrera = trim((string) Request::input('carrera', ''));
    $cedula = trim((string) Request::input('cedula', ''));
    $periodoId = Request::input('periodo_id', null);
    if ($correo === '' || $nombre === '' || $cedula === '') {
        Response::error('correo, nombre y cedula son requeridos', 400);
    }
    if (Database::get('SELECT id FROM estudiantes WHERE correo = ?', [$correo])) {
        Response::error('Ya existe un estudiante con ese correo', 409);
    }
    $id = Database::run(
        'INSERT INTO estudiantes (correo, nombre, apellido, carrera, cedula, activo) VALUES (?,?,?,?,?,1)',
        [$correo, $nombre, $apellido, $carrera, $cedula]
    );
    if ($periodoId) {
        Database::run('INSERT INTO estudiantes_periodos (estudiante_id, periodo_id) VALUES (?,?)', [$id, (int) $periodoId]);
    }
    Response::ok(['id' => $id], 201);
}

// GET /admin/estudiantes/{id}/intentos — historial de intentos de evaluacion (badge en la tabla)
if (preg_match('#^estudiantes/(\d+)/intentos$#', $sub, $mmIntentos) && $m === 'GET') {
    $idIntentos = (int) $mmIntentos[1];
    $listaIntentos = Database::all(
        'SELECT fecha_intento, resultado_cefr, duracion_seg FROM intentos_evaluacion
         WHERE estudiante_id = ? ORDER BY fecha_intento DESC',
        [$idIntentos]
    );
    Response::ok(['intentos' => $listaIntentos]);
}

if (preg_match('#^estudiantes/(\d+)$#', $sub, $mm)) {
    $id = (int) $mm[1];
    if ($m === 'GET') {
        $estudianteUno = Database::get(
            'SELECT id, correo, nombre, apellido, carrera, cedula, activo, created_at FROM estudiantes WHERE id = ?',
            [$id]
        );
        if (!$estudianteUno) {
            Response::error('Estudiante no encontrado', 404);
        }
        $periodoUno = Database::get(
            'SELECT p.id, p.periodo FROM estudiantes_periodos ep JOIN periodos p ON p.id = ep.periodo_id
             WHERE ep.estudiante_id = ? ORDER BY ep.id DESC LIMIT 1',
            [$id]
        );
        $estudianteUno['periodo'] = $periodoUno ?: null;
        $estudianteUno['intentos'] = Database::all(
            'SELECT fecha_intento, resultado_cefr, duracion_seg FROM intentos_evaluacion
             WHERE estudiante_id = ? ORDER BY fecha_intento DESC',
            [$id]
        );
        Response::ok(['estudiante' => $estudianteUno]);
    }
    if ($m === 'PUT') {
        $rol(['ti', 'coordinador']);
        if (!Database::get('SELECT id FROM estudiantes WHERE id = ?', [$id])) {
            Response::error('Estudiante no encontrado', 404);
        }
        Database::run(
            'UPDATE estudiantes SET correo = ?, nombre = ?, apellido = ?, carrera = ?, cedula = ?, activo = ? WHERE id = ?',
            [
                strtolower(trim((string) Request::input('correo', ''))),
                trim((string) Request::input('nombre', '')),
                trim((string) Request::input('apellido', '')),
                trim((string) Request::input('carrera', '')),
                trim((string) Request::input('cedula', '')),
                (int) Request::input('activo', 1),
                $id,
            ]
        );
        $periodoId = Request::input('periodo_id', null);
        if ($periodoId) {
            Database::run('DELETE FROM estudiantes_periodos WHERE estudiante_id = ?', [$id]);
            Database::run('INSERT INTO estudiantes_periodos (estudiante_id, periodo_id) VALUES (?,?)', [$id, (int) $periodoId]);
        }
        Response::ok();
    }
    if ($m === 'DELETE') {
        $rol(['ti', 'coordinador']);
        Database::run('DELETE FROM estudiantes_periodos WHERE estudiante_id = ?', [$id]);
        Database::run('DELETE FROM estudiantes WHERE id = ?', [$id]);
        Response::ok();
    }
}

if (preg_match('#^estudiantes/(\d+)/estado$#', $sub, $mm) && $m === 'PATCH') {
    $rol(['ti', 'coordinador']);
    Database::run('UPDATE estudiantes SET activo = ? WHERE id = ?', [(int) Request::input('activo', 1), (int) $mm[1]]);
    Response::ok();
}
if (preg_match('#^estudiantes/(\d+)/intentos$#', $sub, $mm) && $m === 'DELETE') {
    $rol(['ti', 'coordinador']);
    $idEstudiante = (int) $mm[1];
    Database::run('DELETE FROM intentos_evaluacion WHERE estudiante_id = ?', [$idEstudiante]);
    Response::ok();
}

// ============ CARGA MASIVA CSV ============
// El frontend (estudiantes.js) llama a "importar-masivo"; se acepta tambien "importar" por compatibilidad.
if (in_array($sub, ['estudiantes/importar', 'estudiantes/importar-masivo'], true) && $m === 'POST') {
    $rol(['ti', 'coordinador']);
    $periodoId = (int) Request::input('periodo_id', 0);
    $grupo = trim((string) Request::input('nombre_grupo', 'Importacion'));
    if (!$periodoId || !Database::get('SELECT id FROM periodos WHERE id = ?', [$periodoId])) {
        Response::error('periodo_id valido es requerido', 400);
    }
    if (empty($_FILES['archivo']['tmp_name'])) {
        Response::error('Archivo CSV requerido (campo "archivo")', 400);
    }
    $fh = fopen($_FILES['archivo']['tmp_name'], 'r');
    if (!$fh) {
        Response::error('No se pudo leer el CSV', 400);
    }
    $insertados = 0; $vinculados = 0; $totalFilasCsv = 0; $encabezado = null;
    while (($row = fgetcsv($fh)) !== false) {
        if ($encabezado === null) {
            $encabezado = array_map(fn($h) => strtolower(trim($h)), $row);
            continue;
        }
        $d = array_combine($encabezado, array_pad($row, count($encabezado), ''));
        $correo = strtolower(trim($d['correo'] ?? ''));
        if ($correo === '') continue;
        $totalFilasCsv++;
        $eid = Database::get('SELECT id FROM estudiantes WHERE correo = ?', [$correo]);
        if (!$eid) {
            $id = Database::run(
                'INSERT INTO estudiantes (correo, nombre, apellido, carrera, cedula, activo) VALUES (?,?,?,?,?,1)',
                [$correo, trim($d['nombre'] ?? ''), trim($d['apellido'] ?? ''), trim($d['carrera'] ?? ''), trim($d['cedula'] ?? '')]
            );
            $insertados++;
        } else {
            $id = (int) $eid['id'];
        }
        if (!Database::get('SELECT id FROM estudiantes_periodos WHERE estudiante_id = ? AND periodo_id = ?', [$id, $periodoId])) {
            Database::run('INSERT INTO estudiantes_periodos (estudiante_id, periodo_id) VALUES (?,?)', [$id, $periodoId]);
            $vinculados++;
        }
    }
    fclose($fh);
    Database::run(
        'INSERT INTO importaciones (nombre_grupo, periodo_id, cantidad, importado_por) VALUES (?,?,?,?)',
        [$grupo, $periodoId, $insertados, $u['id']]
    );
    Response::ok(['insertados' => $insertados, 'vinculados' => $vinculados, 'total' => $totalFilasCsv]);
}

// ============ DOCENTES ============
if ($sub === 'docentes' && $m === 'GET') {
    // Paginacion + busqueda + filtro por estado (esperado por public_html/js/admin-sections/docentes.js)
    $paginaDoc = max(1, (int) Request::input('page', 1));
    $limiteDoc = max(1, min(100, (int) Request::input('limit', 20)));
    $filtroDoc = (string) Request::input('filtro', 'todos'); // activos | inactivos | todos
    $buscarDoc = trim((string) Request::input('search', ''));

    $condicionesDoc = [];
    $paramsDoc = [];
    if ($filtroDoc === 'activos') {
        $condicionesDoc[] = 'activo = 1';
    } elseif ($filtroDoc === 'inactivos') {
        $condicionesDoc[] = 'activo = 0';
    }
    if ($buscarDoc !== '') {
        $condicionesDoc[] = '(correo LIKE ? OR nombre LIKE ? OR apellido LIKE ?)';
        $comodinDoc = '%' . $buscarDoc . '%';
        array_push($paramsDoc, $comodinDoc, $comodinDoc, $comodinDoc);
    }
    $whereDoc = $condicionesDoc ? ('WHERE ' . implode(' AND ', $condicionesDoc)) : '';

    $totalDoc = (int) (Database::get("SELECT COUNT(*) c FROM docentes $whereDoc", $paramsDoc)['c'] ?? 0);
    $offsetDoc = ($paginaDoc - 1) * $limiteDoc;
    $filasDoc = Database::all(
        "SELECT id, correo, nombre, apellido, especialidad, activo, created_at
         FROM docentes $whereDoc ORDER BY nombre LIMIT $limiteDoc OFFSET $offsetDoc",
        $paramsDoc
    );
    Response::ok(['docentes' => $filasDoc, 'total' => $totalDoc, 'page' => $paginaDoc, 'limit' => $limiteDoc]);
}
if ($sub === 'docentes' && $m === 'POST') {
    $rol(['ti']);
    $correo = strtolower(trim((string) Request::input('correo', '')));
    if ($correo === '' || trim((string) Request::input('nombre', '')) === '') {
        Response::error('correo y nombre son requeridos', 400);
    }
    if (Database::get('SELECT id FROM docentes WHERE correo = ?', [$correo])) {
        Response::error('Ya existe un docente con ese correo', 409);
    }
    $id = Database::run(
        'INSERT INTO docentes (correo, nombre, apellido, especialidad, activo) VALUES (?,?,?,?,?)',
        [$correo, trim((string) Request::input('nombre', '')), trim((string) Request::input('apellido', '')), trim((string) Request::input('especialidad', '')), (int) Request::input('activo', 1)]
    );
    Response::ok(['id' => $id], 201);
}
if (preg_match('#^docentes/(\d+)$#', $sub, $mm)) {
    $id = (int) $mm[1];
    if ($m === 'PUT') {
        $rol(['ti']);
        Database::run(
            'UPDATE docentes SET correo = ?, nombre = ?, apellido = ?, especialidad = ?, activo = ? WHERE id = ?',
            [strtolower(trim((string) Request::input('correo', ''))), trim((string) Request::input('nombre', '')), trim((string) Request::input('apellido', '')), trim((string) Request::input('especialidad', '')), (int) Request::input('activo', 1), $id]
        );
        Response::ok();
    }
    if ($m === 'DELETE') {
        $rol(['ti']);
        Database::run('DELETE FROM docentes WHERE id = ?', [$id]);
        Response::ok();
    }
}

// ============ PERIODOS ============
if ($sub === 'periodos' && $m === 'GET') {
    // Paginacion + filtro por estado (esperado por public_html/js/admin-sections/periodos.js)
    $paginaPer = max(1, (int) Request::input('page', 1));
    $limitePer = max(1, min(100, (int) Request::input('limit', 20)));
    $filtroPer = (string) Request::input('filtro', 'todos'); // activos | inactivos | todos

    $condicionesPer = [];
    if ($filtroPer === 'activos') {
        $condicionesPer[] = 'activo = 1';
    } elseif ($filtroPer === 'inactivos') {
        $condicionesPer[] = 'activo = 0';
    }
    $wherePer = $condicionesPer ? ('WHERE ' . implode(' AND ', $condicionesPer)) : '';

    $totalPer = (int) (Database::get("SELECT COUNT(*) c FROM periodos $wherePer")['c'] ?? 0);
    $offsetPer = ($paginaPer - 1) * $limitePer;
    $filasPer = Database::all(
        "SELECT id, periodo, fecha_inicio, fecha_fin, activo, created_at
         FROM periodos $wherePer ORDER BY periodo DESC LIMIT $limitePer OFFSET $offsetPer"
    );
    Response::ok(['periodos' => $filasPer, 'total' => $totalPer, 'page' => $paginaPer, 'limit' => $limitePer]);
}

// GET /admin/periodos/{id}/evaluaciones — listado de evaluaciones rendidas en ese periodo
// (usado al hacer clic en una fila de la tabla de periodos)
if (preg_match('#^periodos/(\d+)/evaluaciones$#', $sub, $mmEval) && $m === 'GET') {
    $idPeriodo = (int) $mmEval[1];
    $periodoEval = Database::get('SELECT id, periodo FROM periodos WHERE id = ?', [$idPeriodo]);
    if (!$periodoEval) {
        Response::error('Periodo no encontrado', 404);
    }
    $limiteEval = max(1, min(500, (int) Request::input('limit', 100)));
    $filasEval = Database::all(
        "SELECT er.resultado_cefr, er.timestamp, e.correo AS estudiante_email, e.nombre, e.apellido
         FROM evaluaciones_rendidas er
         JOIN estudiantes e ON e.id = er.estudiante_id
         WHERE er.periodo_academico = ?
         ORDER BY er.timestamp DESC LIMIT $limiteEval",
        [$periodoEval['periodo']]
    );
    foreach ($filasEval as &$fe) {
        $fe['estudiante_nombre'] = trim($fe['nombre'] . ' ' . ($fe['apellido'] ?? ''));
    }
    unset($fe);
    Response::ok(['periodo' => $periodoEval, 'evaluaciones' => $filasEval, 'total' => count($filasEval)]);
}
if ($sub === 'periodos' && $m === 'POST') {
    $rol(['ti', 'coordinador']);
    $periodo = trim((string) Request::input('periodo', ''));
    if ($periodo === '') Response::error('periodo es requerido', 400);
    if (Database::get('SELECT id FROM periodos WHERE periodo = ?', [$periodo])) {
        Response::error('El periodo ya existe', 409);
    }
    $id = Database::run(
        'INSERT INTO periodos (periodo, fecha_inicio, fecha_fin, activo) VALUES (?,?,?,?)',
        [$periodo, (string) Request::input('fecha_inicio', ''), (string) Request::input('fecha_fin', ''), (int) Request::input('activo', 1)]
    );
    Response::ok(['id' => $id], 201);
}
if (preg_match('#^periodos/(\d+)$#', $sub, $mm)) {
    $id = (int) $mm[1];
    if ($m === 'PUT') {
        $rol(['ti', 'coordinador']);
        Database::run(
            'UPDATE periodos SET periodo = ?, fecha_inicio = ?, fecha_fin = ?, activo = ? WHERE id = ?',
            [trim((string) Request::input('periodo', '')), (string) Request::input('fecha_inicio', ''), (string) Request::input('fecha_fin', ''), (int) Request::input('activo', 1), $id]
        );
        Response::ok();
    }
    if ($m === 'DELETE') {
        $rol(['ti', 'coordinador']);
        Database::run('DELETE FROM periodos WHERE id = ?', [$id]);
        Response::ok();
    }
}

// ============ ADMINISTRADORES (solo ti) ============
// ENDPOINT TEMPORAL: Reset must_change_password para todos (testing)
if ($sub === 'administradores/reset-must-change' && $m === 'POST') {
    $rol(['ti']);
    Database::run('UPDATE administradores SET must_change_password = 1 WHERE rol IS NOT NULL');
    Response::ok(['mensaje' => 'All administrators reset to must_change_password = 1']);
}

if ($sub === 'administradores' && $m === 'GET') {
    $rol(['ti']);
    Response::ok(['administradores' => Database::all('SELECT id, correo, nombre, rol, activo, created_at, must_change_password FROM administradores ORDER BY nombre')]);
}
if ($sub === 'administradores' && $m === 'POST') {
    $rol(['ti']);
    $correo = strtolower(trim((string) Request::input('correo', '')));
    $nombre = trim((string) Request::input('nombre', ''));
    $rolNuevo = (string) Request::input('rol', '');
    $pass = (string) Request::input('password', '');
    if ($correo === '' || $nombre === '' || !in_array($rolNuevo, ['ti', 'coordinador', 'docente'], true) || strlen($pass) < 8) {
        Response::error('correo, nombre, rol valido y password (min 8) son requeridos', 400);
    }
    if (Database::get('SELECT id FROM administradores WHERE correo = ?', [$correo])) {
        Response::error('Ya existe un usuario con ese correo', 409);
    }
    $id = Database::run(
        'INSERT INTO administradores (correo, password_hash, nombre, rol, created_by, must_change_password) VALUES (?,?,?,?,?,1)',
        [$correo, password_hash($pass, PASSWORD_BCRYPT), $nombre, $rolNuevo, $u['id']]
    );
    Response::ok(['id' => $id], 201);
}
if (preg_match('#^administradores/(\d+)$#', $sub, $mm) && $m === 'PUT') {
    $rol(['ti']);
    $idAdmin = (int) $mm[1];
    $nombre = trim((string) Request::input('nombre', ''));
    $rolNuevo = (string) Request::input('rol', '');
    if ($nombre === '' || !in_array($rolNuevo, ['ti', 'coordinador', 'docente'], true)) {
        Response::error('nombre y rol valido son requeridos', 400);
    }
    Database::run(
        'UPDATE administradores SET nombre = ?, rol = ? WHERE id = ?',
        [$nombre, $rolNuevo, $idAdmin]
    );
    Response::ok();
}
if (preg_match('#^administradores/(\d+)/estado$#', $sub, $mm) && $m === 'PATCH') {
    $rol(['ti']);
    Database::run('UPDATE administradores SET activo = ? WHERE id = ?', [(int) Request::input('activo', 1), (int) $mm[1]]);
    Response::ok();
}
if (preg_match('#^administradores/(\d+)$#', $sub, $mm) && $m === 'DELETE') {
    $rol(['ti']);
    $idAdmin = (int) $mm[1];
    // No permitir que TI se borre a sí mismo
    if ((int) $u['id'] === $idAdmin) {
        Response::error('No puedes eliminar tu propia cuenta', 403);
    }
    Database::run('DELETE FROM administradores WHERE id = ?', [$idAdmin]);
    Response::ok();
}

Response::error("Ruta admin no encontrada: /$ruta ($m)", 404);
