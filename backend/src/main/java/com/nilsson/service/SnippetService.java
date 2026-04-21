package com.nilsson.service;

import com.nilsson.dto.OrderRequest;
import com.nilsson.model.Folder;
import com.nilsson.model.Snippet;
import com.nilsson.repository.FolderRepository;
import com.nilsson.repository.SnippetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * ──────────────────────────────────────────────
 * <h2>SnippetService</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Orchestrates all code snippet management operations, including creation, retrieval, update, deletion, and organization.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Provides an API for managing code snippets and their associated metadata.</li>
 * <li>Synchronizes database entities with their physical file representations using {@code LocalFileSystemStorage}.</li>
 * <li>Handles file system modifications corresponding to snippet mutations (e.g., content changes, renames, moves, deletions).</li>
 * <li>Broadcasts WebSocket messages to connected clients to ensure real-time updates on snippet changes.</li>
 * <li>Manages snippet ordering, tagging, descriptions, and favorite status.</li>
 * <li>Supports searching and filtering of snippets.</li>
 * <li>Facilitates the creation of new snippets from existing templates.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A Spring {@code @Service} that encapsulates the core business logic for snippet management, interacting with {@code SnippetRepository}, {@code FolderRepository}, {@code LocalFileSystemStorage}, and {@code SimpMessagingTemplate} for data persistence, file operations, and real-time client communication.</p>
 * ──────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SnippetService {

    private final SnippetRepository repository;
    private final SimpMessagingTemplate messagingTemplate;
    private final LocalFileSystemStorage storage;
    private final FolderRepository folderRepository;

    private String buildRelativePath(Snippet snippet) {
        String folderName = null;
        if (snippet.getFolderId() != null && !snippet.getFolderId().isBlank()) {
            folderName = folderRepository.findById(snippet.getFolderId())
                    .map(Folder::getName)
                    .orElse(null);
        }
        return FilePathUtils.relativePathFor(
                folderName, snippet.getLanguage(), snippet.getTitle());
    }

    public Snippet createSnippet(String title, String language) {
        String relativePath = FilePathUtils.relativePathFor(null, language, title);

        try {
            storage.write(relativePath, "");
        } catch (IOException e) {
            log.error("Failed to create file for new snippet '{}': {}", title, e.getMessage());
            throw new RuntimeException("Could not create snippet file: " + relativePath, e);
        }

        Snippet snippet = Snippet.builder()
                .id(UUID.randomUUID())
                .title(title)
                .language(language)
                .content("")
                .filePath(relativePath)
                .lastModified(java.time.Instant.now())
                .build();

        Snippet saved = repository.save(snippet);
        broadcast("created");
        return saved;
    }

    public void updateContent(String id, String content) {
        Snippet s = repository.findById(UUID.fromString(id)).orElseThrow();
        s.setContent(content);
        repository.save(s);
        try {
            if (s.getFilePath() != null) {
                storage.write(s.getFilePath(), content);
            }
        } catch (IOException e) {
            log.error("Failed to write content for snippet {}: {}", id, e.getMessage());
        }
        broadcast("updated");
    }

    public void rename(String id, String title) {
        Snippet s = repository.findById(UUID.fromString(id)).orElseThrow();
        String oldPath = s.getFilePath();
        s.setTitle(title);
        String newPath = buildRelativePath(s);
        s.setFilePath(newPath);
        repository.save(s);

        try {
            if (oldPath != null && storage.exists(oldPath)) {
                storage.move(oldPath, newPath);
            } else {
                // File doesn't exist yet — write it fresh
                storage.write(newPath, s.getContent() != null ? s.getContent() : "");
                log.info("Created missing file during rename: {}", newPath);
            }
        } catch (IOException e) {
            log.error("Failed to rename/create file for snippet {}: {}", id, e.getMessage());
        }
        broadcast("renamed");
    }

    public void delete(String id) {
        Snippet s = repository.findById(UUID.fromString(id)).orElseThrow();
        repository.deleteById(UUID.fromString(id));
        try {
            storage.delete(s.getFilePath());
        } catch (IOException e) {
            log.error("Failed to delete file for snippet {}: {}", id, e.getMessage());
        }
        broadcast("deleted");
    }

    public void updateTags(String id, List<String> tags) {
        Snippet s = repository.findById(UUID.fromString(id)).orElseThrow();
        s.setTags(tags);
        repository.save(s);
    }

    public void updateDescription(String id, String description) {
        Snippet s = repository.findById(UUID.fromString(id)).orElseThrow();
        s.setDescription(description);
        repository.save(s);
    }

    public List<Snippet> search(String q, String language) {
        if (q == null || q.isBlank()) {
            return language != null
                    ? repository.findByLanguage(language)
                    : repository.findAllByOrderBySortOrderAscLastModifiedDesc();
        }
        List<Snippet> results = repository.searchByQuery(q);
        if (language != null) {
            results = results.stream()
                    .filter(s -> s.getLanguage().equals(language))
                    .collect(Collectors.toList());
        }
        return results;
    }

    public void toggleFavorite(String id) {
        Snippet s = repository.findById(UUID.fromString(id)).orElseThrow();
        s.setFavorite(!s.isFavorite());
        repository.save(s);
        broadcast("updated");
    }

    public void updateOrder(List<OrderRequest> order) {
        for (OrderRequest req : order) {
            repository.findById(UUID.fromString(req.id())).ifPresent(s -> {
                s.setSortOrder(req.sortOrder());
                repository.save(s);
            });
        }
    }

    public void moveSnippets(List<String> ids, String folderId) {
        ids.forEach(id ->
                repository.findById(UUID.fromString(id)).ifPresent(s -> {
                    String oldPath = s.getFilePath();
                    s.setFolderId(folderId);
                    String newPath = buildRelativePath(s);
                    s.setFilePath(newPath);
                    repository.save(s);
                    try {
                        storage.move(oldPath, newPath);
                    } catch (IOException e) {
                        log.error("Failed to move file for snippet {}: {}", id, e.getMessage());
                    }
                })
        );
        broadcast("moved");
    }

    public List<Snippet> getTemplates() {
        return repository.findByTemplateTrue();
    }

    public Snippet createFromTemplate(String templateId) {
        Snippet template = repository.findById(UUID.fromString(templateId)).orElseThrow();
        Snippet newSnippet = Snippet.builder()
                .id(UUID.randomUUID())
                .title(template.getTitle() + " (copy)")
                .language(template.getLanguage())
                .content(template.getContent())
                .description(template.getDescription())
                .tags(new ArrayList<>(template.getTags()))
                .build();
        Snippet saved = repository.save(newSnippet);
        String relativePath = buildRelativePath(saved);
        try {
            storage.write(relativePath, saved.getContent() != null ? saved.getContent() : "");
            saved.setFilePath(relativePath);
            repository.save(saved);
        } catch (IOException e) {
            log.error("Failed to write file for snippet {}: {}", saved.getId(), e.getMessage());
        }
        broadcast("created");
        return saved;
    }

    private void broadcast(String message) {
        messagingTemplate.convertAndSend("/topic/snippets", message);
    }
}