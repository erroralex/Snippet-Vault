package com.nilsson.dto;

/**
 * ──────────────────────────────────────────────
 * <h2>OrderRequest</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Represents a Data Transfer Object (DTO) for updating the sort order of an entity.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Carries the unique identifier (ID) of the entity.</li>
 * <li>Carries the new sort order value for the entity.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A Java record used in API requests to specify the new ordering for items, typically in a list or hierarchical structure. Records provide a concise syntax for immutable data carriers.</p>
 * ──────────────────────────────────────────────
 */
public record OrderRequest(String id, int sortOrder) {
}
