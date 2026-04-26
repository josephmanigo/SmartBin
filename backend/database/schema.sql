-- SmartBin Database Schema
-- Run this in your MySQL server

CREATE DATABASE IF NOT EXISTS smartbin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartbin;

CREATE TABLE IF NOT EXISTS users (
    id          INT          UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(180) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bins (
    id            INT          UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT          UNSIGNED NOT NULL,
    name          VARCHAR(100) NOT NULL,
    location      VARCHAR(200) NULL,
    device_id     VARCHAR(100) NOT NULL UNIQUE,
    bin_height    INT          NOT NULL DEFAULT 30 COMMENT 'Height of bin in cm',
    status        ENUM('Empty','Half-Full','Full') NOT NULL DEFAULT 'Empty',
    last_distance DECIMAL(6,2) NULL,
    last_updated  TIMESTAMP    NULL,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bin_logs (
    id         INT          UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bin_id     INT          UNSIGNED NOT NULL,
    distance   DECIMAL(6,2) NOT NULL,
    status     ENUM('Empty','Half-Full','Full') NOT NULL,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bin_id) REFERENCES bins(id) ON DELETE CASCADE,
    INDEX idx_bin_created (bin_id, created_at DESC)
) ENGINE=InnoDB;
