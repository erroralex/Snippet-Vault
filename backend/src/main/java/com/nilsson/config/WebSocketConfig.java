package com.nilsson.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * ──────────────────────────────────────────────
 * <h2>WebSocketConfig</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Configures WebSocket support and establishes the STOMP messaging infrastructure for real-time, bi-directional communication.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Enables and configures a simple message broker to route messages to designated client destinations (e.g., {@code /topic}).</li>
 * <li>Registers the primary STOMP endpoint ({@code /ws}) where frontend clients establish their initial WebSocket connection.</li>
 * <li>Configures CORS rules specifically for the WebSocket endpoint, restricting access to trusted origins.</li>
 * <li>Sets application destination prefixes for routing messages from the client to specific server-side handlers.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A Spring {@code @Configuration} class implementing {@code WebSocketMessageBrokerConfigurer}, annotated with {@code @EnableWebSocketMessageBroker} to set up the necessary beans and routing logic for real-time UI updates.</p>
 * ──────────────────────────────────────────────
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }
}