<?php
namespace MiaTech\Storage;

/**
 * OneDriveStorage — STUB. Se implementara cuando TI habilite el registro de app en Entra ID.
 *
 * Al implementarlo aqui quedara encapsulado:
 *   - Token OAuth2 (client credentials) con cache y refresco.
 *   - Subida por sesion (chunked/upload session) para archivos > 4 MB (videos ~50 MB).
 *   - Generacion de enlaces/stream de descarga via Microsoft Graph.
 *
 * Para activar: implementar los metodos y poner STORAGE_DRIVER=onedrive en .env.
 * El resto de la aplicacion NO cambia (usa StorageInterface).
 */
class OneDriveStorage implements StorageInterface
{
    public function __construct(private array $cfg)
    {
    }

    private function noDisponible(): void
    {
        throw new \RuntimeException(
            'OneDriveStorage aun no implementado (pendiente de credenciales de TI / Entra ID).'
        );
    }

    public function guardar(string $clave, string $rutaArchivoTmp): string { $this->noDisponible(); }
    public function leer(string $clave): string { $this->noDisponible(); }
    public function existe(string $clave): bool { $this->noDisponible(); }
    public function eliminar(string $clave): bool { $this->noDisponible(); }
    public function urlDescarga(string $clave): ?string { $this->noDisponible(); }

    public function nombre(): string
    {
        return 'onedrive';
    }
}
