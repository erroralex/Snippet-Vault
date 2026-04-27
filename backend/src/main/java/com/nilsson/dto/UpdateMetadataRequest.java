package com.nilsson.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateMetadataRequest(
        @NotBlank(message = "Title is required") String title,
        @NotBlank(message = "Language is required") String language,
        String description
) {
}
