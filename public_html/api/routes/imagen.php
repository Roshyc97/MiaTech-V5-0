<?php
use MiaTech\Response;

$dir = \config('grabacion.image_path');
$fallback = ['id' => 'placeholder', 'src' => '/img/imagenes/placeholder.png'];

if (!is_dir($dir)) {
    Response::ok($fallback);
}
$exts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
$files = array_values(array_filter(scandir($dir) ?: [], function ($f) use ($exts) {
    return in_array(strtolower(pathinfo($f, PATHINFO_EXTENSION)), $exts, true);
}));
if (!$files) {
    Response::ok($fallback);
}
$file = $files[random_int(0, count($files) - 1)];
$folder = basename(rtrim($dir, '/'));
Response::ok([
    'id'  => pathinfo($file, PATHINFO_FILENAME),
    'src' => "/img/$folder/$file",
]);
