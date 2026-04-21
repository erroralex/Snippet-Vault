package com.nilsson.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a logical grouping mechanism for snippets. Folders provide a way to
 * organize snippets hierarchically within the application. They can be nested
 * (via the parentId property), assigned custom colors and icons for visual
 * distinction, and manually ordered within the user interface. This entity holds
 * the persistent state of a folder, which is managed via the FolderController
 * and associated services.
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

    @Column(nullable = false)
    private int sortOrder = 0;

    @Column
    private String color;

    @Column
    private String icon;

    @Column(nullable = false)
    private boolean expanded = true;
}
