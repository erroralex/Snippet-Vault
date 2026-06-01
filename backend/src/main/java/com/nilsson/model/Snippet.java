package com.nilsson.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ──────────────────────────────────────────────
 * <h2>Snippet Model</h2>
 * ──────────────────────────────────────────────
 * <p>
 * <strong>Responsibility:</strong> Represents a code snippet stored in the
 * system, encompassing its metadata, organizational properties, and actual
 * content.
 * </p>
 * <p>
 * <strong>Functions:</strong>
 * </p>
 * <ul>
 * <li>Encapsulates the core data of a snippet, including its {@code title},
 * {@code language}, and textual {@code content}.</li>
 * <li>Maintains metadata such as user-defined {@code tags}, an AI-generated
 * {@code aiSummary}, and a detailed {@code description}.</li>
 * <li>Tracks organizational properties including its containing
 * {@code folderId}, {@code favorite} status, manual {@code sortOrder}, and
 * visual {@code colorLabel}.</li>
 * <li>Stores the synchronization link to the physical file system via the
 * unique {@code filePath} and {@code lastModified} timestamp.</li>
 * <li>Defines if the snippet acts as a reusable {@code template}.</li>
 * </ul>
 * <p>
 * <strong>Technical Role:</strong> A JPA {@code @Entity} utilizing Lombok
 * annotations, acting as the primary persistent data model synchronized with
 * the local file system by the {@code FileWatcherService} and managed by the
 * {@code SnippetRepository}.
 * </p>
 * ──────────────────────────────────────────────
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Snippet {
    @Id
    private UUID id;

    private String title;
    private String language;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "snippet_tags", joinColumns = @JoinColumn(name = "snippet_id"))
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String aiSummary;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(unique = true)
    private String filePath;

    private Instant lastModified;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean favorite = false;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "integer default 0")
    private int sortOrder = 0;

    @Column
    private String colorLabel;

    @Column
    private String folderId;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean template = false;
}