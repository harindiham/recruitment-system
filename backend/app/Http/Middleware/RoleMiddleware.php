<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        if ($request->user()?->role?->name !== $role) {
            return response()->json([
                'message' => 'You are not authorised to access this resource.',
            ], 403);
        }

        return $next($request);
    }
}