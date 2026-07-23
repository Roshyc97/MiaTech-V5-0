<?php
namespace MiaTech;

/** Extraccion de audio del video con ffmpeg (confirmado disponible en SiteGround, Fase 0). */
class Ffmpeg
{
    /**
     * Extrae el audio del video y devuelve la ruta del audio.
     * Usa WAV PCM 16-bit, 16kHz mono: el encoder pcm_s16le es parte del nucleo
     * de ffmpeg (nunca falta, a diferencia de libmp3lame que no esta compilado
     * en SiteGround) y 16kHz mono es el formato recomendado por GROQ/Whisper.
     */
    public static function extraerAudio(string $rutaVideo): string
    {
        $bin = \config('ffmpeg.bin');
        $rutaAudio = preg_replace('/\.[^.]*$/', '', $rutaVideo) . '_audio.wav';
        $cmd = sprintf(
            '%s -y -i %s -vn -ac 1 -ar 16000 -c:a pcm_s16le %s 2>&1',
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