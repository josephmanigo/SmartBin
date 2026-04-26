<?php
require_once __DIR__ . '/../config/database.php';

class ArduinoController {
    private PDO $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    private function calcStatus(float $distance, int $binHeight): string {
        $pct = ($binHeight > 0) ? ($distance / $binHeight) : 1;
        if ($pct > 0.66) return 'Empty';
        if ($pct > 0.33) return 'Half-Full';
        return 'Full';
    }

    /** POST /api/arduino/data
     *  Body: { "bin_id": "DEVICE_ID_STRING", "distance": 12.5 }
     */
    public function receive(): void {
        $data     = json_decode(file_get_contents('php://input'), true);
        $deviceId = trim($data['bin_id'] ?? '');
        $distance = isset($data['distance']) ? (float) $data['distance'] : null;

        if (!$deviceId || $distance === null) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'bin_id and distance are required.']);
            return;
        }
        if ($distance < 0 || $distance > 9999) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Invalid distance value.']);
            return;
        }

        // Find bin by device_id
        $stmt = $this->db->prepare('SELECT id, bin_height FROM bins WHERE device_id = ?');
        $stmt->execute([$deviceId]);
        $bin = $stmt->fetch();

        if (!$bin) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Device not registered.']);
            return;
        }

        $binId  = (int) $bin['id'];
        $status = $this->calcStatus($distance, (int) $bin['bin_height']);

        // Insert log
        $logStmt = $this->db->prepare(
            'INSERT INTO bin_logs (bin_id, distance, status) VALUES (?, ?, ?)'
        );
        $logStmt->execute([$binId, $distance, $status]);

        // Update bin status
        $updStmt = $this->db->prepare(
            'UPDATE bins SET status = ?, last_distance = ?, last_updated = NOW() WHERE id = ?'
        );
        $updStmt->execute([$status, $distance, $binId]);

        echo json_encode([
            'success'  => true,
            'message'  => 'Data received.',
            'bin_id'   => $binId,
            'distance' => $distance,
            'status'   => $status,
        ]);
    }
}
