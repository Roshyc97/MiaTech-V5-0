<?php
namespace MiaTech\Storage;

/**
 * Contrato de almacenamiento. Toda la app usa esta interfaz; nunca rutas fisicas.
 *
 * Regla 1: en la BD se guarda una referencia logica (driver + clave), no una ruta absoluta.
 * Regla 2: las descargas pasan por un endpoint PHP que resuelve la clave via este driver,
 *          nunca por un enlace directo al archivo. Asi, migrar a OneDrive no rompe enlaces.
 */
interface StorageInterface
{
    /** Guarda un archivo temporal bajo una clave logica (ej. "2025B/videos/juan.webm"). Devuelve la clave. */
    public function guardar(string $clave, string $rutaArchivoTmp): string;

    /** Devuelve el contenido binario de la clave (para streaming/descarga). */
    public function leer(string $clave): string;

    /** Indica si la clave existe. */
    public function existe(string $clave): bool;

    /** Elimina la clave. Devuelve true si ya no existe. */
    public function eliminar(string $clave): bool;

    /** URL de descarga directa si el driver la soporta; null si se sirve por endpoint PHP. */
    public function urlDescarga(string $clave): ?string;

    /** Nombre del driver (se guarda junto a la referencia en la BD). */
    public function nombre(): string;
}
