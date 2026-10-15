<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                // Allow validation exceptions to return standard field errors
                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    return null;
                }

                // Authentication error (401)
                if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                    return response()->json([
                        'status' => false,
                        'message' => 'Unauthenticated (401). Please log in to continue.'
                    ], 401);
                }

                // Authorization / Permission error (403)
                if ($e instanceof \Illuminate\Auth\Access\AuthorizationException ||
                    $e instanceof \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException) {
                    return response()->json([
                        'status' => false,
                        'message' => 'Access Denied (403). You do not have permission to access this resource.'
                    ], 403);
                }

                // Resource not found (404)
                if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException ||
                    $e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
                    return response()->json([
                        'status' => false,
                        'message' => 'Resource Not Found (404).'
                    ], 404);
                }

                // HTTP Method not allowed (405)
                if ($e instanceof \Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException) {
                    return response()->json([
                        'status' => false,
                        'message' => 'Method Not Allowed (405).'
                    ], 405);
                }

                // Log the technical error internally for developers
                \Illuminate\Support\Facades\Log::error('API Error [' . get_class($e) . ']: ' . $e->getMessage(), [
                    'url' => $request->fullUrl(),
                    'method' => $request->method(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);

                // Determine HTTP status code
                $statusCode = 500;
                if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                    $statusCode = $e->getStatusCode();
                }

                $friendlyMessages = [
                    400 => 'Bad Request (400). Please check your submission.',
                    401 => 'Unauthenticated (401).',
                    403 => 'Forbidden (403). Access denied.',
                    404 => 'Resource Not Found (404).',
                    405 => 'Method Not Allowed (405).',
                    419 => 'Session Expired (419). Please refresh and try again.',
                    429 => 'Too Many Requests (429). Please wait a moment.',
                    500 => 'Server Error (500). Please try again later or contact support.',
                    502 => 'Bad Gateway (502). Service temporarily unavailable.',
                    503 => 'Service Unavailable (503). Server is undergoing maintenance.',
                    504 => 'Gateway Timeout (504). Please try again.',
                ];

                $userMessage = $friendlyMessages[$statusCode] ?? "Server Error ({$statusCode}). Please try again later.";

                return response()->json([
                    'status' => false,
                    'message' => $userMessage
                ], $statusCode);
            }
        });
    })->create();
