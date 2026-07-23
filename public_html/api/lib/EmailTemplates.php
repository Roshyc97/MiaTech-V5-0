<?php
namespace MiaTech;

/**
 * EmailTemplates — plantillas HTML de correo, separadas del flujo de negocio.
 * Si se necesita cambiar el formato o el contenido de un correo, se edita
 * UNICAMENTE aqui; el resto de la aplicacion solo llama a estos metodos.
 */
class EmailTemplates
{
    /**
     * Correo de confirmacion de envio para el alumno (Speaking Test).
     * $d: ['nombre' => nombre completo, 'fecha' => 'Y-m-d H:i', 'periodo' => string]
     */
    public static function confirmacionAlumno(array $d): string
    {
        $nombre  = htmlspecialchars($d['nombre'] ?? '', ENT_QUOTES, 'UTF-8');
        $fecha   = htmlspecialchars($d['fecha'] ?? date('Y-m-d H:i'), ENT_QUOTES, 'UTF-8');
        $periodo = htmlspecialchars($d['periodo'] ?? '', ENT_QUOTES, 'UTF-8');

        return <<<HTML
<div style="background:#f1efe8;padding:24px;font-family:Arial, Helvetica, sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e0d8;border-radius:8px;overflow:hidden;">

<div style="background:#0c447c;padding:20px 28px;">
<span style="color:#ffffff;font-size:17px;font-weight:bold;">Mi&#64;Tech &mdash; Centro de Idiomas ITS Jap&oacute;n</span>
</div>

<div style="padding:28px;">
<p style="margin:0 0 16px;font-size:15px;color:#2c2c2a;">Hola {$nombre},</p>

<p style="margin:0 0 16px;font-size:15px;color:#2c2c2a;line-height:1.6;">
El alumno <strong>{$nombre}</strong> ha realizado la evaluaci&oacute;n del Speaking Test para la
prueba de ubicaci&oacute;n en el Centro de Idiomas del ITS Jap&oacute;n.
</p>

<p style="margin:0 0 24px;font-size:15px;color:#2c2c2a;line-height:1.6;">
Su evaluaci&oacute;n ha sido enviada a los docentes para su revisi&oacute;n y obtendr&aacute; una
respuesta en un plazo de <strong>5 d&iacute;as laborables</strong>.
</p>

<table style="width:100%;border-collapse:collapse;margin-bottom:8px;background:#f1efe8;border-radius:6px;">
<tr>
<td style="padding:10px 16px;font-size:13px;color:#5f5e5a;width:40%;">Nombre</td>
<td style="padding:10px 16px;font-size:13px;color:#2c2c2a;font-weight:bold;">{$nombre}</td>
</tr>
<tr>
<td style="padding:10px 16px;font-size:13px;color:#5f5e5a;border-top:1px solid #e2e0d8;">Fecha</td>
<td style="padding:10px 16px;font-size:13px;color:#2c2c2a;border-top:1px solid #e2e0d8;">{$fecha}</td>
</tr>
<tr>
<td style="padding:10px 16px;font-size:13px;color:#5f5e5a;border-top:1px solid #e2e0d8;">Periodo</td>
<td style="padding:10px 16px;font-size:13px;color:#2c2c2a;border-top:1px solid #e2e0d8;">{$periodo}</td>
</tr>
</table>
</div>

<div style="background:#f8f7f3;padding:18px 28px;border-top:1px solid #e2e0d8;">
<p style="margin:0;font-size:12px;color:#888780;line-height:1.6;">
Instituto Tecnol&oacute;gico Superior Jap&oacute;n &mdash; Centro de Idiomas<br>
Mi&#64;Tech - Test Assessment - v5.0<br>
Este es un mensaje autom&aacute;tico, por favor no responder a este correo.
</p>
</div>

</div>
</div>
HTML;
    }

    /**
     * Correo de recuperacion para administradores (contrasena temporal).
     * $d: ['nombre' => string, 'temporal' => clave temporal, 'caducidad' => '1 hora']
     */
    public static function recuperacionAdmin(array $d): string
    {
        $nombre    = htmlspecialchars($d['nombre'] ?? '', ENT_QUOTES, 'UTF-8');
        $temporal  = htmlspecialchars($d['temporal'] ?? '', ENT_QUOTES, 'UTF-8');
        $caducidad = htmlspecialchars($d['caducidad'] ?? '1 hora', ENT_QUOTES, 'UTF-8');

        return <<<HTML
<div style="background:#f1efe8;padding:24px;font-family:Arial, Helvetica, sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e0d8;border-radius:8px;overflow:hidden;">

<div style="background:#0c447c;padding:20px 28px;">
<span style="color:#ffffff;font-size:17px;font-weight:bold;">Mi&#64;Tech &mdash; Administraci&oacute;n</span>
</div>

<div style="padding:28px;">
<p style="margin:0 0 16px;font-size:15px;color:#2c2c2a;">Hola {$nombre},</p>

<p style="margin:0 0 16px;font-size:15px;color:#2c2c2a;line-height:1.6;">
Recibimos una solicitud para restablecer tu contrase&ntilde;a. Usa la siguiente
<strong>contrase&ntilde;a temporal</strong> para iniciar sesi&oacute;n:
</p>

<div style="margin:0 0 16px;padding:16px;background:#f1efe8;border:1px dashed #0c447c;border-radius:6px;text-align:center;">
<span style="font-family:'Courier New', monospace;font-size:22px;font-weight:bold;letter-spacing:2px;color:#0c447c;">{$temporal}</span>
</div>

<p style="margin:0 0 16px;font-size:14px;color:#993c1d;line-height:1.6;">
Esta contrase&ntilde;a temporal caduca en <strong>{$caducidad}</strong>. Al iniciar sesi&oacute;n
se te pedir&aacute; crear una nueva contrase&ntilde;a de inmediato.
</p>

<p style="margin:0;font-size:13px;color:#5f5e5a;line-height:1.6;">
Si no solicitaste este cambio, ignora este correo; tu contrase&ntilde;a actual sigue siendo v&aacute;lida.
</p>
</div>

<div style="background:#f8f7f3;padding:18px 28px;border-top:1px solid #e2e0d8;">
<p style="margin:0;font-size:12px;color:#888780;line-height:1.6;">
Instituto Tecnol&oacute;gico Superior Jap&oacute;n &mdash; Centro de Idiomas<br>
Mi&#64;Tech - Test Assessment - v5.0<br>
Este es un mensaje autom&aacute;tico, por favor no responder a este correo.
</p>
</div>

</div>
</div>
HTML;
    }
}
