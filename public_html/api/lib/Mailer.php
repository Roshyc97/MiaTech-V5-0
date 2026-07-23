<?php
namespace MiaTech;

/**
 * Mailer — envio SMTP minimo (fsockopen + AUTH LOGIN), sin dependencias.
 * Soporta SSL (465) y STARTTLS (587). Configuracion en .env (SMTP_*).
 * NOTA: requiere prueba con servidor real; en sandbox no hay SMTP.
 */
class Mailer
{
    public static function enviar(string $para, string $asunto, string $htmlCuerpo): array
    {
        $cfg = \config('smtp');
        if (empty($cfg['host']) || empty($cfg['user'])) {
            return ['ok' => false, 'error' => 'SMTP no configurado'];
        }
        $host = $cfg['host'];
        $port = (int) $cfg['port'];
        $user = $cfg['user'];
        $pass = $cfg['password'];
        $from = $cfg['from'] ?: $user;
        $fromName = $cfg['from_name'];
        $ssl = ($port === 465);

        $remote = ($ssl ? 'ssl://' : '') . $host . ':' . $port;
        $fp = @stream_socket_client($remote, $errno, $errstr, 20);
        if (!$fp) {
            return ['ok' => false, 'error' => "conexion SMTP: $errstr ($errno)"];
        }
        $read = function () use ($fp) {
            $data = '';
            while ($line = fgets($fp, 515)) {
                $data .= $line;
                if (isset($line[3]) && $line[3] === ' ') break;
            }
            return $data;
        };
        $cmd = function ($c) use ($fp, $read) {
            fwrite($fp, $c . "\r\n");
            return $read();
        };

        // EHLO debe anunciar un nombre valido; Office365 rechaza nombres no-FQDN.
        $ehlo = 'EHLO ' . ($cfg['ehlo'] ?? 'miatech.local');

        $read();
        $cmd($ehlo);
        if (!$ssl) {
            $rTls = $cmd('STARTTLS');
            if (strpos($rTls, '220') === false) {
                fclose($fp);
                return ['ok' => false, 'error' => 'STARTTLS rechazado: ' . trim($rTls)];
            }
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                fclose($fp);
                return ['ok' => false, 'error' => 'STARTTLS: negociacion TLS fallida'];
            }
            $cmd($ehlo);
        }
        $cmd('AUTH LOGIN');
        $cmd(base64_encode($user));
        $r = $cmd(base64_encode($pass));
        if (strpos($r, '235') === false) {
            fclose($fp);
            return ['ok' => false, 'error' => 'autenticacion SMTP fallida: ' . trim($r)];
        }
        $rFrom = $cmd("MAIL FROM:<$from>");
        if (strpos($rFrom, '250') === false) {
            fclose($fp);
            return ['ok' => false, 'error' => 'MAIL FROM rechazado: ' . trim($rFrom)];
        }
        $rRcpt = $cmd("RCPT TO:<$para>");
        if (strpos($rRcpt, '250') === false) {
            fclose($fp);
            return ['ok' => false, 'error' => 'RCPT TO rechazado: ' . trim($rRcpt)];
        }
        $cmd('DATA');
        $headers  = "From: $fromName <$from>\r\n";
        $headers .= "To: <$para>\r\n";
        $headers .= 'Subject: =?UTF-8?B?' . base64_encode($asunto) . "?=\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
        $r = $cmd($headers . $htmlCuerpo . "\r\n.");
        $cmd('QUIT');
        fclose($fp);
        return ['ok' => (strpos($r, '250') !== false), 'error' => (strpos($r, '250') !== false ? null : 'envio rechazado: ' . trim($r))];
    }
}
