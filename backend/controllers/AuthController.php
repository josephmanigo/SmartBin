<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class AuthController {
    private PDO $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function register(): void {
        $data = json_decode(file_get_contents('php://input'), true);

        $name     = trim($data['name'] ?? '');
        $email    = trim(strtolower($data['email'] ?? ''));
        $password = $data['password'] ?? '';

        if (!$name || !$email || !$password) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Name, email, and password are required.']);
            return;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
            return;
        }
        if (strlen($password) < 6) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters.']);
            return;
        }

        // Check duplicate email
        $stmt = $this->db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Email is already registered.']);
            return;
        }

        $hashed = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $this->db->prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
        $stmt->execute([$name, $email, $hashed]);
        $userId = (int) $this->db->lastInsertId();

        $token = AuthMiddleware::generateToken(['user_id' => $userId, 'email' => $email]);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Registration successful.',
            'token'   => $token,
            'user'    => ['id' => $userId, 'name' => $name, 'email' => $email, 'avatar' => null],
        ]);
    }

    public function login(): void {
        $data = json_decode(file_get_contents('php://input'), true);

        $email    = trim(strtolower($data['email'] ?? ''));
        $password = $data['password'] ?? '';

        if (!$email || !$password) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
            return;
        }

        $stmt = $this->db->prepare('SELECT id, name, email, password, avatar FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
            return;
        }

        $token = AuthMiddleware::generateToken(['user_id' => $user['id'], 'email' => $user['email']]);

        echo json_encode([
            'success' => true,
            'message' => 'Login successful.',
            'token'   => $token,
            'user'    => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'avatar' => $user['avatar']],
        ]);
    }

    public function me(): void {
        $payload = AuthMiddleware::validateToken();
        $stmt    = $this->db->prepare('SELECT id, name, email, avatar, created_at FROM users WHERE id = ?');
        $stmt->execute([$payload['user_id']]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'User not found.']);
            return;
        }
        echo json_encode(['success' => true, 'user' => $user]);
    }

    public function updateAvatar(): void {
        $payload = AuthMiddleware::validateToken();
        $data = json_decode(file_get_contents('php://input'), true);
        
        $avatar = $data['avatar'] ?? null;
        
        // Allowed to be null or a base64 string
        $stmt = $this->db->prepare('UPDATE users SET avatar = ? WHERE id = ?');
        $stmt->execute([$avatar, $payload['user_id']]);
        
        echo json_encode(['success' => true, 'avatar' => $avatar]);
    }
}
