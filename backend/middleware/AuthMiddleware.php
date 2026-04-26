<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthMiddleware {
    private static string $secret;

    public static function init(): void {
        self::$secret = $_ENV['JWT_SECRET'] ?? 'smartbin_jwt_super_secret_key_2024';
    }

    public static function generateToken(array $payload): string {
        self::init();
        $payload['iat'] = time();
        $payload['exp'] = time() + (60 * 60 * 24 * 7); // 7 days
        return JWT::encode($payload, self::$secret, 'HS256');
    }

    public static function validateToken(): array {
        self::init();
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'No token provided.']);
            exit;
        }

        $token = substr($authHeader, 7);
        try {
            $decoded = JWT::decode($token, new Key(self::$secret, 'HS256'));
            return (array) $decoded;
        } catch (Exception $e) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid or expired token.']);
            exit;
        }
    }
}
