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
 * Represents a code snippet stored in the local file system. This core entity
 * encapsulates all the metadata and content associated with a snippet, including
 * its language, tags, AI-generated summary, user-defined description, and
 * organizational properties like its containing folder, favorite status, and
 * manual sort order. Snippets are synchronized between the database and the
 * local file system by the FileWatcherService.
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