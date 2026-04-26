<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class BinController {
    private PDO $db;
    private int $userId;

    public function __construct() {
        $database     = new Database();
        $this->db     = $database->getConnection();
        $payload      = AuthMiddleware::validateToken();
        $this->userId = (int) $payload['user_id'];
    }

    private function calcStatus(float $distance, int $binHeight): string {
        $pct = ($binHeight > 0) ? ($distance / $binHeight) : 1;
        if ($pct > 0.66) return 'Empty';
        if ($pct > 0.33) return 'Half-Full';
        return 'Full';
    }

    /** GET /api/bins */
    public function index(): void {
        $stmt = $this->db->prepare(
            'SELECT id, name, location, device_id, bin_height, status, last_distance, last_updated, created_at
             FROM bins WHERE user_id = ? ORDER BY created_at DESC'
        );
        $stmt->execute([$this->userId]);
        $bins = $stmt->fetchAll();
        echo json_encode(['success' => true, 'bins' => $bins]);
    }

    /** GET /api/bins/{id} */
    public function show(int $id): void {
        $stmt = $this->db->prepare(
            'SELECT id, name, location, device_id, bin_height, status, last_distance, last_updated, created_at
             FROM bins WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$id, $this->userId]);
        $bin = $stmt->fetch();
        if (!$bin) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Bin not found.']);
            return;
        }
        echo json_encode(['success' => true, 'bin' => $bin]);
    }

    /** POST /api/bins */
    public function store(): void {
        $data      = json_decode(file_get_contents('php://input'), true);
        $name      = trim($data['name'] ?? '');
        $location  = trim($data['location'] ?? '');
        $deviceId  = trim($data['device_id'] ?? '');
        $binHeight = (int) ($data['bin_height'] ?? 30);

        if (!$name || !$deviceId) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Bin name and device ID are required.']);
            return;
        }
        if ($binHeight < 5 || $binHeight > 300) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Bin height must be between 5 and 300 cm.']);
            return;
        }

        // Device ID unique check
        $chk = $this->db->prepare('SELECT id FROM bins WHERE device_id = ?');
        $chk->execute([$deviceId]);
        if ($chk->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Device ID is already registered.']);
            return;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO bins (user_id, name, location, device_id, bin_height) VALUES (?,?,?,?,?)'
        );
        $stmt->execute([$this->userId, $name, $location ?: null, $deviceId, $binHeight]);
        $newId = (int) $this->db->lastInsertId();

        $this->show($newId);
    }

    /** PUT /api/bins/{id} */
    public function update(int $id): void {
        // Ownership check
        $chk = $this->db->prepare('SELECT id FROM bins WHERE id = ? AND user_id = ?');
        $chk->execute([$id, $this->userId]);
        if (!$chk->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Bin not found.']);
            return;
        }

        $data      = json_decode(file_get_contents('php://input'), true);
        $name      = trim($data['name'] ?? '');
        $location  = trim($data['location'] ?? '');
        $deviceId  = trim($data['device_id'] ?? '');
        $binHeight = (int) ($data['bin_height'] ?? 30);

        if (!$name || !$deviceId) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Bin name and device ID are required.']);
            return;
        }

        // Device ID unique (exclude self)
        $chk2 = $this->db->prepare('SELECT id FROM bins WHERE device_id = ? AND id != ?');
        $chk2->execute([$deviceId, $id]);
        if ($chk2->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Device ID is already used by another bin.']);
            return;
        }

        $stmt = $this->db->prepare(
            'UPDATE bins SET name=?, location=?, device_id=?, bin_height=? WHERE id=? AND user_id=?'
        );
        $stmt->execute([$name, $location ?: null, $deviceId, $binHeight, $id, $this->userId]);

        $this->show($id);
    }

    /** DELETE /api/bins/{id} */
    public function destroy(int $id): void {
        $stmt = $this->db->prepare('DELETE FROM bins WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $this->userId]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Bin not found.']);
            return;
        }
        echo json_encode(['success' => true, 'message' => 'Bin deleted successfully.']);
    }

    /** GET /api/bins/{id}/logs */
    public function logs(int $id): void {
        // ownership
        $chk = $this->db->prepare('SELECT id FROM bins WHERE id = ? AND user_id = ?');
        $chk->execute([$id, $this->userId]);
        if (!$chk->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Bin not found.']);
            return;
        }
        $limit  = min((int) ($_GET['limit'] ?? 100), 500);
        $offset = (int) ($_GET['offset'] ?? 0);
        $stmt   = $this->db->prepare(
            'SELECT id, distance, status, created_at FROM bin_logs
             WHERE bin_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
        );
        $stmt->execute([$id, $limit, $offset]);
        $logs = $stmt->fetchAll();
        echo json_encode(['success' => true, 'logs' => $logs]);
    }
    /** GET /api/logs */
    public function allLogs(): void {
        $limit  = min((int) ($_GET['limit'] ?? 50), 200);
        $offset = (int) ($_GET['offset'] ?? 0);
        $stmt   = $this->db->prepare(
            'SELECT l.id, l.bin_id, b.name as bin_name, l.distance, l.status, l.created_at 
             FROM bin_logs l
             JOIN bins b ON l.bin_id = b.id
             WHERE b.user_id = ? 
             ORDER BY l.created_at DESC LIMIT ? OFFSET ?'
        );
        $stmt->execute([$this->userId, $limit, $offset]);
        $logs = $stmt->fetchAll();
        echo json_encode(['success' => true, 'logs' => $logs]);
    }
}
