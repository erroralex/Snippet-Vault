package com.nilsson.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * ──────────────────────────────────────────────
 * <h2>RenameRequest</h2>
 * ──────────────────────────────────────────────
 * <p>
 * <strong>Responsibility:</strong> Represents a Data Transfer Object (DTO) for
 * requesting a rename operation for a snippet or folder.
 * </p>
 * <p>
 * <strong>Functions:</strong>
 * </p>
 * <ul>
 * <li>Carries the new title for the entity to be renamed.</li>
 * <li>Includes validation to ensure the new title is not blank.</li>
 * </ul>
 * <p>
 * <strong>Technical Role:</strong> A simple data carrier used in API requests
 * for renaming. Utilizes Lombok's {@code @Data} for boilerplate reduction and
 * Jakarta Bean Validation's {@code @NotBlank} for input validation.
 * </p>
 * ──────────────────────────────────────────────
 */
@Data
public class RenameRequest {
    @NotBlank
    public String title;
}
