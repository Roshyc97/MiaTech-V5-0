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

        $read();
        $cmd('EHLO miatech');
        if (!$ssl) {
            $cmd('STARTTLS');
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                fclose($fp);
                return ['ok' => false, 'error' => 'STARTTLS fallido'];
            }
            $cmd('EHLO miatech');
        }
        $cmd('AUTH LOGIN');
        $cmd(base64_encode($user));
        $r = $cmd(base64_encode($pass));
        if (strpos($r, '235') === false) {
            fclose($fp);
            return ['ok' => false, 'error' => 'autenticacion SMTP fallida'];
        }
        $cmd("MAIL FROM:<$from>");
        $cmd("RCPT TO:<$para>");
        $cmd('DATA');
        $headers  = "From: $fromName <$from>\r\n";
        $headers .= "To: <$para>\r\n";
        $headers .= 'Subject: =?UTF-8?B?' . base64_encode($asunto) . "?=\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
        $r = $cmd($headers . $htmlCuerpo . "\r\n.");
        $cmd('QUIT');
        fclose($fp);
        return ['ok' => (strpos($r, '250') !== false)];
    }
}
