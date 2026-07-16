<?php
namespace MiaTech\Storage;

/** Driver de almacenamiento en disco local (SiteGround). Activo por defecto. */
class LocalStorage implements StorageInterface
{
    private string $base;

    public function __construct(string $basePath)
    {
        $this->base = rtrim($basePath, '/');
    }

    /** Resuelve la ruta fisica saneando la clave (previene path traversal). */
    private function ruta(string $clave): string
    {
        $clave = str_replace(['..', "\0"], '', $clave);
        return $this->base . '/' . ltrim($clave, '/');
    }

    public function guardar(string $clave, string $rutaArchivoTmp): string
    {
        $destino = $this->ruta($clave);
        @mkdir(dirname($destino), 0775, true);
        if (!@copy($rutaArchivoTmp, $destino)) {
            throw new \RuntimeException("No se pudo guardar en local: $clave");
        }
        return $clave;
    }

    public function leer(string $clave): string
    {
        $r = $this->ruta($clave);
        if (!is_file($r)) {
            throw new \RuntimeException("No existe: $clave");
        }
        return file_get_contents($r);
    }

    public function existe(string $clave): bool
    {
        return is_file($this->ruta($clave));
    }

    public function eliminar(string $clave): bool
    {
        $r = $this->ruta($clave);
        return is_file($r) ? @unlink($r) : true;
    }

    /** En local no hay URL publica: el archivo vive fuera del web root y se sirve por endpoint. */
    public function urlDescarga(string $clave): ?string
    {
        return null;
    }

    public function nombre(): string
    {
        return 'local';
    }
}
