package com.notnilsson.individuelluppgiftjavabackend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * <h2>SecurityConfig</h2>
 * <p>Denna konfigurationsklass ansvarar för applikationens säkerhetsinställningar.
 * Den definierar åtkomstregler för olika endpoints baserat på användarroller
 * samt konfigurerar autentiseringsmetoder och lösenordshantering.</p>
 *
 * <p>Huvudsakliga ansvarsområden:</p>
 * <ul>
 *     <li>Definition av {@code SecurityFilterChain} för att styra HTTP-säkerhet.</li>
 *     <li>Rollbaserad åtkomstkontroll (RBAC) för administratörs- och medlemssidor.</li>
 *     <li>Konfiguration av HTTP Basic Authentication.</li>
 *     <li>Exponering av en {@code PasswordEncoder} (BCrypt) för säker lösenordshantering.</li>
 * </ul>
 */
@Configuration
@EnableMethodSecurity
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth

                        // Admin endpoints
                        .requestMatchers("/admin/**").hasRole("ADMIN")

                        // Member endpoints
                        .requestMatchers(HttpMethod.GET, "/mypages/members").hasRole("USER")
                        .requestMatchers(HttpMethod.PUT, "/mypages/members/{id}").hasRole("USER")

                        .anyRequest().authenticated()
                )
                .httpBasic(org.springframework.security.config.Customizer.withDefaults());
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}