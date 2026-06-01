package com.nilsson.dto;

import lombok.Data;

import java.util.List;

/**
 * ──────────────────────────────────────────────
 * <h2>TagsRequest</h2>
 * ──────────────────────────────────────────────
 * <p>
 * <strong>Responsibility:</strong> Represents a Data Transfer Object (DTO) for
 * updating the tags associated with a snippet.
 * </p>
 * <p>
 * <strong>Functions:</strong>
 * </p>
 * <ul>
 * <li>Carries a list of strings, each representing a tag.</li>
 * </ul>
 * <p>
 * <strong>Technical Role:</strong> A simple data carrier used in API requests
 * to modify snippet tags. Utilizes Lombok's {@code @Data} annotation for
 * boilerplate reduction.
 * </p>
 * ──────────────────────────────────────────────
 */
@Data
public class TagsRequest {
    public List<String> tags;
}
