package com.nilsson.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * ──────────────────────────────────────────────
 * <h2>HealthController</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Provides a simple health check endpoint to verify that the Spring Boot application is running and accessible.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Exposes a lightweight, unauthenticated endpoint that returns a simple string response.</li>
 * <li>Allows external processes (such as the Electron frontend launcher) to poll and wait for the backend to become fully operational before rendering the main UI.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A minimal Spring {@code @RestController} mapped to {@code /api/health}, providing essential status information without incurring the overhead of database access or complex business logic.</p>
 * ──────────────────────────────────────────────
 */
@RestController
public class HealthController {
    @GetMapping("/api/health")
    public String healthCheck() {
        return "OK";
    }
}
