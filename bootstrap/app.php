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
                        'message' => 'Your session has expired. Please log in again.'
                    ], 401);
                }

                // Authorization / Permission error (403)
                if ($e instanceof \Illuminate\Auth\Access\AuthorizationException ||
                    $e instanceof \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException) {
                    return response()->json([
                        'status' => false,
                        'message' => 'You do not have permission to perform this action.'
                    ], 403);
                }

                // Resource not found (404)
                if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException ||
                    $e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
                    return response()->json([
                        'status' => false,
                        'message' => 'The requested record could not be found.'
                    ], 404);
                }

                // Database unique constraint violation (SQLSTATE 23000 / code 1062)
                if ($e instanceof \Illuminate\Database\QueryException && ($e->errorInfo[1] ?? null) === 1062) {
                    $dupMsg = 'A record with this information already exists.';
                    if (str_contains($e->getMessage(), 'product_code')) {
                        $dupMsg = 'This product code already exists.';
                    } elseif (str_contains($e->getMessage(), 'email')) {
                        $dupMsg = 'This email address is already in use.';
                    }
                    return response()->json([
                        'status' => false,
                        'message' => $dupMsg
                    ], 422);
                }

                // HTTP Method not allowed (405)
                if ($e instanceof \Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException) {
                    return response()->json([
                        'status' => false,
                        'message' => 'Method Not Allowed (405).'
                    ], 405);
                }

                // Log the technical error internally for developers without exposing to client
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
                    400 => 'Invalid request. Please verify the entered information.',
                    401 => 'Your session has expired. Please log in again.',
                    403 => 'You do not have permission to perform this action.',
                    404 => 'The requested record could not be found.',
                    405 => 'Method Not Allowed (405).',
                    419 => 'Your session has expired. Please log in again.',
                    422 => 'Please check the required fields and verify the entered information.',
                    429 => 'Too Many Requests (429). Please wait a moment.',
                    500 => 'An unexpected internal server error occurred. Please try again.',
                    502 => 'Bad gateway. Please try again in a moment.',
                    503 => 'Service temporarily unavailable. Please try again later.',
                    504 => 'Gateway timeout. Please try again.',
                ];

                $userMessage = $friendlyMessages[$statusCode] ?? 'An unexpected error occurred. Please try again.';

                return response()->json([
                    'status' => false,
                    'message' => $userMessage
                ], $statusCode);
            }
        });
    })->create();
