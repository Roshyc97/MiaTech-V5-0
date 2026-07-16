<?php
/**
 * server-local.php — Router para el servidor embebido de PHP (SOLO pruebas locales).
 * Replica lo que hace el .htaccess: /api/* -> front controller; el resto, archivos estaticos.
 *
 * Uso (desde la carpeta MiaTech-v5-PHP):
 *   php -S localhost:8000 -t public_html server-local.php
 * Luego abre:  http://localhost:8000/
 */
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
if (preg_match('#^/api(/|$)#', $uri)) {
    require __DIR__ . '/public_html/api/index.php';
    return true;
}
return false; // el servidor sirve el archivo estatico (html, css, js, img, audio)
