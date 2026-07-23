<?php
/**
 * config.php — Carga de configuración desde .env (sin dependencias externas).
 * Todo lo sensible (GROQ, SMTP, BD, storage) vive aquí y NUNCA se expone al frontend.
 * Devuelve un array de configuración que bootstrap.php guarda como global.
 */

/** Mini parser de .env (evita depender de Composer en el esqueleto). */
function cargarEnv(string $ruta): void
{
    if (!is_file($ruta)) {
        return;
    }
    foreach (file($ruta, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linea) {
        $linea = trim($linea);
        if ($linea === '' || $linea[0] === '#' || !str_contains($linea, '=')) {
            continue;
        }
        [$clave, $valor] = explode('=', $linea, 2);
        $clave = trim($clave);
        $valor = trim($valor);
        if (strlen($valor) >= 2 && ($valor[0] === '"' || $valor[0] === "'")) {
            $valor = substr($valor, 1, -1);
        }
        if (getenv($clave) === false) {
            putenv("$clave=$valor");
            $_ENV[$clave] = $valor;
        }
    }
}

/** Lee una variable de entorno con normalización de booleanos. */
function env(string $clave, $porDefecto = null)
{
    $v = getenv($clave);
    if ($v === false) {
        return $porDefecto;
    }
    $l = strtolower($v);
    if ($l === 'true')  return true;
    if ($l === 'false') return false;
    return $v;
}

// Cargar .env desde la raíz del proyecto (dos niveles arriba de /public_html/api)
cargarEnv(dirname(__DIR__, 2) . '/.env.local'); // overrides locales (no se sube)
cargarEnv(dirname(__DIR__, 2) . '/.env');

return [
    'app' => [
        'env'               => env('APP_ENV', 'development'),
        'debug'             => env('APP_DEBUG', true),
        'base_url'          => env('APP_BASE_URL', ''),
        'periodo_academico' => env('PERIODO_ACADEMICO', '2025B'),
    ],
    'db' => [
        // driver: 'mysql' (SiteGround) o 'sqlite' (local rápido). PDO abstrae ambos.
        'driver'      => env('DB_DRIVER', 'sqlite'),
        'host'        => env('DB_HOST', 'localhost'),
        'port'        => env('DB_PORT', '3306'),
        'name'        => env('DB_NAME', 'miatech'),
        'user'        => env('DB_USER', 'root'),
        'password'    => env('DB_PASSWORD', ''),
        'charset'     => env('DB_CHARSET', 'utf8mb4'),
        'sqlite_path' => env('DB_SQLITE_PATH', dirname(__DIR__, 2) . '/db/miatech.sqlite'),
    ],
    'groq' => [
        'api_key'       => env('GROQ_API_KEY', ''),
        'model'         => env('GROQ_MODEL', 'openai/gpt-oss-120b'),
        'whisper_model' => env('GROQ_WHISPER_MODEL', 'whisper-large-v3-turbo'),
        'base_url'      => env('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
    ],
    'smtp' => [
        // Correo institucional; configurable porque puede cambiar a futuro.
        'host'      => env('SMTP_HOST', ''),
        'port'      => env('SMTP_PORT', '587'),
        'user'      => env('SMTP_USER', ''),
        'password'  => env('SMTP_PASSWORD', ''),
        'from'      => env('SMTP_FROM', ''),
        'from_name' => env('SMTP_FROM_NAME', 'MiaTech - Centro de Idiomas'),
    ],
    'storage' => [
        // driver activo: 'local' (SiteGround) | 'onedrive' (futuro).
        // Cambiar aquí NO toca el resto de la aplicación.
        'driver'     => env('STORAGE_DRIVER', 'local'),
        'local_path' => env('STORAGE_LOCAL_PATH', dirname(__DIR__, 2) . '/storage'),
        'onedrive'   => [
            'tenant_id'     => env('ONEDRIVE_TENANT_ID', ''),
            'client_id'     => env('ONEDRIVE_CLIENT_ID', ''),
            'client_secret' => env('ONEDRIVE_CLIENT_SECRET', ''),
            'drive_id'      => env('ONEDRIVE_DRIVE_ID', ''),
            'base_folder'   => env('ONEDRIVE_BASE_FOLDER', 'MiaTech'),
        ],
    ],
    'grabacion' => [
        'min_seg'    => (int) env('MIN_RECORDING_DURATION', 60),
        'max_seg'    => (int) env('MAX_RECORDING_DURATION', 300),
        'label'      => env('RECORDING_TIME_LABEL', '1-5 min'),
        'task_text'  => env('TASK_TEXT', 'Describe the picture.'),
        'image_path' => env('IMAGE_PATH', dirname(__DIR__) . '/img/imagenes/'),
    ],
    'ffmpeg' => [
        // Fase 0 confirmó ffmpeg 8.1.1 disponible vía exec() en SiteGround.
        'bin' => env('FFMPEG_BIN', 'ffmpeg'),
    ],
];
