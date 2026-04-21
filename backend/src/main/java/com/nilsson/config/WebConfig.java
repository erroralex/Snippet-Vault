package com.nilsson.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configures Cross-Origin Resource Sharing (CORS) for the application.
 * This class defines the rules that allow the frontend application, running on
 * localhost:4200, to communicate with the backend API. It ensures that only
 * requests from trusted origins can access the API endpoints, enhancing security.
 * The configuration is granular, with specific rules for general API endpoints
 * and more restrictive rules for the management (actuator) endpoints.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:4200", "file://")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH");

        registry.addMapping("/actuator/**")
                .allowedOrigins("http://localhost:4200", "file://")
                .allowedMethods("POST");
    }
}
