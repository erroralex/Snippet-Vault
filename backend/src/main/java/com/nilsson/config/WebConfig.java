package com.nilsson.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * ──────────────────────────────────────────────
 * <h2>WebConfig</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Configures Cross-Origin Resource Sharing (CORS) rules for the application to facilitate secure communication between the frontend and backend.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Defines global CORS policies allowing the local frontend environment (e.g., localhost:4200) and native file origins to interact with the backend API.</li>
 * <li>Permits standard HTTP methods (GET, POST, PUT, DELETE, PATCH) across general application endpoints.</li>
 * <li>Establishes restrictive CORS policies specifically for Spring Boot Actuator management endpoints, limiting access to POST methods from trusted origins.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A Spring {@code @Configuration} class implementing {@code WebMvcConfigurer} to register and manage CORS mappings within the web MVC application context.</p>
 * ──────────────────────────────────────────────
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:4200", "file://")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH");

        registry.addMapping("/actuator/**")
                .allowedOrigins("http://localhost:4200", "file://")
                .allowedMethods("POST");
    }
}