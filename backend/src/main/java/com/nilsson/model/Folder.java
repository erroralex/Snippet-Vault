package com.nilsson.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ──────────────────────────────────────────────
 * <h2>Folder Model</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Represents a logical grouping mechanism for organizing snippets within the application.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Provides a data structure for storing folder entities in the database.</li>
 * <li>Enables hierarchical organization through the {@code parentId} property, allowing folders to be nested.</li>
 * <li>Stores visual customization properties such as custom {@code color} and {@code icon}.</li>
 * <li>Maintains UI state for rendering, including a manual {@code sortOrder} and whether the folder is {@code expanded} in the tree view.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A JPA {@code @Entity} mapped to the "folders" table, utilizing Lombok annotations ({@code @Data}, {@code @Builder}, etc.) for boilerplate reduction, serving as the persistent data model managed by {@code FolderRepository}.</p>
 * ──────────────────────────────────────────────
 */
@Entity
@Table(name = "folders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Folder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column
    private String parentId;

    @Builder.Default
    @Column(nullable = false)
    private int sortOrder = 0;

    @Column
    private String color;

    @Column
    private String icon;

    @Builder.Default
    @Column(nullable = false)
    private boolean expanded = true;
}