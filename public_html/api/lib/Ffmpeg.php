<?php
namespace MiaTech;

/** Extraccion de audio del video con ffmpeg (confirmado disponible en SiteGround, Fase 0). */
class Ffmpeg
{
    /** Extrae el audio a webm/opus y devuelve la ruta del audio. */
    public static function extraerAudio(string $rutaVideo): string
    {
        $bin = \config('ffmpeg.bin');
        $rutaAudio = preg_replace('/\.[^.]*$/', '', $rutaVideo) . '_audio.webm';
        $cmd = sprintf(
            '%s -y -i %s -vn -c:a libopus -b:a 64k -f webm %s 2>&1',
            escapeshellarg($bin),
            escapeshellarg($rutaVideo),
            escapeshellarg($rutaAudio)
        );
        exec($cmd, $out, $code);
        if ($code !== 0 || !is_file($rutaAudio)) {
            throw new \RuntimeException('ffmpeg fallo al extraer audio: ' . implode(' ', array_slice($out, -3)));
        }
        return $rutaAudio;
    }
}
