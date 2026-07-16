<?php
namespace MiaTech;

/**
 * Groq — transcripcion (Whisper) y evaluacion CEFR (LLM) via cURL.
 * La API key vive en .env (server-side). Portado de services/groq.js.
 */
class Groq
{
    private const SYSTEM_PROMPT = <<<'PROMPT'
You are an expert evaluator of the Common European Framework of Reference (CEFR).
You will receive the transcript of a spoken response from an Ecuadorian university student.
Assess performance using clear criteria: vocabulary, grammar, fluency, coherence, content, and compliance with the expected duration.

Your response must be brief, concrete, and written in a pedagogical feedback style.
Write the justification in 4 to 6 lines maximum, ENTIRELY IN ENGLISH.
Include strengths, weaknesses, and one concrete recommendation for improvement.

Respond ONLY with this JSON, no additional text, no code blocks:
{"nivel_cefr":"A1|A2.1|A2.2|B1","confianza":"high|medium|low","justificacion":"brief text, max 120 words, ENTIRELY IN ENGLISH"}

Valid levels exactly: A1, A2.1, A2.2, B1. No other value.
PROMPT;

    /** Transcribe un archivo de audio con Whisper. Devuelve el texto. */
    public static function transcribir(string $rutaAudio): string
    {
        $key = \config('groq.api_key');
        if (!$key) {
            throw new \RuntimeException('GROQ_API_KEY no configurada');
        }
        $url = rtrim(\config('groq.base_url'), '/') . '/audio/transcriptions';
        $post = [
            'file'            => new \CURLFile($rutaAudio, 'audio/webm', basename($rutaAudio)),
            'model'           => \config('groq.whisper_model'),
            'language'        => 'en',
            'response_format' => 'text',
        ];
        [$code, $body] = self::curl($url, $post, ["Authorization: Bearer $key"], false);
        if ($code < 200 || $code >= 300) {
            throw new \RuntimeException("GROQ Whisper error $code: $body");
        }
        $text = trim($body);
        if ($text === '') {
            throw new \RuntimeException('Whisper devolvio transcripcion vacia');
        }
        return $text;
    }

    /** Evalua una transcripcion. Devuelve ['nivel_cefr','confianza','justificacion']. */
    public static function evaluar(string $transcripcion): array
    {
        if (strlen(trim($transcripcion)) < 5) {
            throw new \RuntimeException('Transcripcion vacia o demasiado corta');
        }
        $key = \config('groq.api_key');
        if (!$key) {
            throw new \RuntimeException('GROQ_API_KEY no configurada');
        }
        $url = rtrim(\config('groq.base_url'), '/') . '/chat/completions';
        $userMsg = "Transcript:\n" . trim($transcripcion) .
            "\n\nAssess vocabulary, grammar, fluency, coherence, content and duration. " .
            "Determine the CEFR level. Respond ONLY with valid JSON, no code blocks.";
        $payload = json_encode([
            'model'       => \config('groq.model'),
            'messages'    => [
                ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
                ['role' => 'user',   'content' => $userMsg],
            ],
            'temperature' => 0.1,
            'max_tokens'  => 500,
        ]);
        [$code, $body] = self::curl($url, $payload, [
            "Authorization: Bearer $key",
            'Content-Type: application/json',
        ], true);
        if ($code < 200 || $code >= 300) {
            throw new \RuntimeException("GROQ LLM error $code: $body");
        }
        $data = json_decode($body, true);
        $raw = $data['choices'][0]['message']['content'] ?? '';
        $parsed = self::parseJson($raw);
        if (!$parsed) {
            throw new \RuntimeException('Respuesta LLM no es JSON valido: ' . $raw);
        }
        $nivel = $parsed['nivel_cefr'] ?? $parsed['nivel'] ?? $parsed['level'] ?? null;
        if (!in_array($nivel, ['A1', 'A2.1', 'A2.2', 'B1'], true)) {
            throw new \RuntimeException("Nivel CEFR invalido: " . var_export($nivel, true));
        }
        return [
            'nivel_cefr'    => $nivel,
            'confianza'     => $parsed['confianza'] ?? 'medium',
            'justificacion' => $parsed['justificacion'] ?? 'Automated evaluation generated from the oral response.',
        ];
    }

    private static function parseJson(?string $raw): ?array
    {
        if (!$raw) return null;
        $t = trim($raw);
        $cands = [];
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/i', $t, $mm)) $cands[] = trim($mm[1]);
        if (preg_match('/\{[\s\S]*\}/', $t, $mm)) $cands[] = trim($mm[0]);
        $cands[] = $t;
        foreach ($cands as $c) {
            $p = json_decode($c, true);
            if (is_array($p)) return $p;
        }
        if (preg_match('/\b(A1|A2\.1|A2\.2|B1)\b/', $t, $mm)) {
            return ['nivel_cefr' => $mm[1], 'confianza' => 'medium', 'justificacion' => 'Automated evaluation generated from the oral response.'];
        }
        return null;
    }

    private static function curl(string $url, $post, array $headers, bool $rawBody): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $post,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 120,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($body === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new \RuntimeException("cURL GROQ: $err");
        }
        curl_close($ch);
        return [$code, $body];
    }
}
