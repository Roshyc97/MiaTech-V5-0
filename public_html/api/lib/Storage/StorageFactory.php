<?php
namespace MiaTech\Storage;

/** Selecciona el driver de almacenamiento segun la configuracion (STORAGE_DRIVER). */
class StorageFactory
{
    public static function crear(): StorageInterface
    {
        $cfg = \config('storage');
        return match ($cfg['driver']) {
            'onedrive' => new OneDriveStorage($cfg['onedrive']),
            default    => new LocalStorage($cfg['local_path']),
        };
    }
}
