package com.gemini.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

/**
 * Immutable DTO for creating a new product.
 */
public record ProductCreateRequest(
        @NotBlank(message = "SKU is required") String sku,
        @NotBlank(message = "Name is required") String name,
        @NotNull @PositiveOrZero BigDecimal price
) {}

/**
 * Immutable DTO for returning product data.
 */
public record ProductResponse(
        String sku,
        String name,
        BigDecimal price
) {}