package com.nilsson.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Provides a simple health check endpoint for the application. This controller
 * is primarily used by the Electron frontend process to determine when the Spring
 * Boot backend has fully started and is ready to accept requests. It offers a
 * lightweight mechanism to verify the application's availability without hitting
 * more complex business logic endpoints.
 */
@RestController
public class HealthController {
    @GetMapping("/api/health")
    public String healthCheck() {
        return "OK";
    }
}
