<?php
namespace MiaTech;

/** Autenticacion basada en sesion PHP + guardas por rol. */
class Auth
{
    public static function usuario(): ?array
    {
        return $_SESSION['usuario'] ?? null;
    }

    public static function login(array $u): void
    {
        session_regenerate_id(true);
        $_SESSION['usuario'] = $u;
    }

    public static function logout(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        @session_destroy();
    }

    public static function requireAuth(): array
    {
        $u = self::usuario();
        if (!$u) {
            Response::error('No autenticado', 401);
        }
        return $u;
    }

    public static function requireAdmin(): array
    {
        $u = self::requireAuth();
        if (($u['tipo'] ?? '') !== 'admin') {
            Response::error('Acceso restringido a administradores', 403);
        }
        return $u;
    }

    public static function requireRol(array $roles): array
    {
        $u = self::requireAdmin();
        if (!in_array($u['rol'] ?? '', $roles, true)) {
            Response::error('No tienes permisos para esta accion', 403);
        }
        return $u;
    }
}
