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
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.UncheckedIOException;
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
@Transactional
public class SnippetService {

    private final SnippetRepository repository;
    private final SimpMessagingTemplate messagingTemplate;
    private final LocalFileSystemStorage storage;
    private final FolderRepository folderRepository;

    private String buildFolderPath(String folderId) {
        if (folderId == null || folderId.isBlank()) {
            return "";
        }
        List<String> segments = new java.util.ArrayList<>();
        String currentId = folderId;
        while (currentId != null && !currentId.isBlank()) {
            Folder f = folderRepository.findById(currentId).orElse(null);
            if (f == null) break;
            segments.add(0, FilePathUtils.sanitiseTitle(f.getName()));
            currentId = f.getParentId();
        }
        return String.join("/", segments);
    }

    private String buildRelativePath(Snippet snippet) {
        String folderPath = buildFolderPath(snippet.getFolderId());
        return FilePathUtils.relativePathFor(
                folderPath, snippet.getLanguage(), snippet.getTitle());
    }

    public String getUniqueFilePath(String relativePath) {
        if (!storage.exists(relativePath)) {
            return relativePath;
        }
        int dotIndex = relativePath.lastIndexOf('.');
        String base = dotIndex == -1 ? relativePath : relativePath.substring(0, dotIndex);
        String ext = dotIndex == -1 ? "" : relativePath.substring(dotIndex);
        int counter = 1;
        while (true) {
            String candidate = base + "_" + counter + ext;
            if (!storage.exists(candidate)) {
                return candidate;
            }
            counter++;
        }
    }

    public Snippet createSnippet(String title, String language) {
        String relativePath = FilePathUtils.relativePathFor(null, language, title);
        relativePath = getUniqueFilePath(relativePath);

        Snippet snippet = Snippet.builder()
                .id(UUID.randomUUID())
                .title(title)
                .language(language)
                .content("")
                .filePath(relativePath)
                .lastModified(java.time.Instant.now())
                .build();

        Snippet saved = repository.save(snippet);

        try {
            storage.write(relativePath, "");
        } catch (IOException e) {
            log.error("Failed to create file for new snippet '{}': {}", title, e.getMessage());
            throw new UncheckedIOException("Could not create snippet file: " + relativePath, e);
        }

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
            throw new UncheckedIOException("Failed to write snippet content to disk", e);
        }
        
        broadcast("updated");
    }

    public void updateMetadata(String id, String title, String language, String description) {
        Snippet s = repository.findById(UUID.fromString(id)).orElseThrow();
        String oldPath = s.getFilePath();
        
        s.setTitle(title);
        s.setLanguage(language);
        s.setDescription(description);
        
        String newPath = buildRelativePath(s);
        if (oldPath != null && !oldPath.equals(newPath)) {
            newPath = getUniqueFilePath(newPath);
        }
        s.setFilePath(newPath);
        repository.save(s);

        try {
            if (oldPath != null && storage.exists(oldPath)) {
                if (!oldPath.equals(newPath)) {
                    storage.move(oldPath, newPath);
                }
            } else {
                storage.write(newPath, s.getContent() != null ? s.getContent() : "");
                log.info("Created missing file during updateMetadata: {}", newPath);
            }
        } catch (IOException e) {
            log.error("Failed to update metadata and move/create file for snippet {}: {}", id, e.getMessage());
            throw new UncheckedIOException("Failed to move/create snippet file on disk", e);
        }
        
        broadcast("updated");
    }

    public void rename(String id, String title) {
        Snippet s = repository.findById(UUID.fromString(id)).orElseThrow();
        String oldPath = s.getFilePath();
        s.setTitle(title);
        String newPath = buildRelativePath(s);
        if (oldPath != null && !oldPath.equals(newPath)) {
            newPath = getUniqueFilePath(newPath);
        }
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
            throw new UncheckedIOException("Failed to rename/create snippet file on disk", e);
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
            throw new UncheckedIOException("Failed to delete snippet file from disk", e);
        }
        
        broadcast("deleted");
    }

    public void updateTags(String id, List<String> tags) {
        Snippet s = repository.findById(UUID.fromString(id)).orElseThrow();
        s.setTags(tags);
        repository.save(s);
        broadcast("updated");
    }

    public void updateDescription(String id, String description) {
        Snippet s = repository.findById(UUID.fromString(id)).orElseThrow();
        s.setDescription(description);
        repository.save(s);
        broadcast("updated");
    }

    @Transactional(readOnly = true)
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
        for (String id : ids) {
            repository.findById(UUID.fromString(id)).ifPresent(s -> {
                String oldPath = s.getFilePath();
                s.setFolderId(folderId);
                String newPath = buildRelativePath(s);
                if (oldPath != null && !oldPath.equals(newPath)) {
                    newPath = getUniqueFilePath(newPath);
                }
                s.setFilePath(newPath);
                repository.save(s);
                try {
                    storage.move(oldPath, newPath);
                } catch (IOException e) {
                    log.error("Failed to move file for snippet {}: {}", id, e.getMessage());
                    throw new UncheckedIOException("Failed to move snippet file on disk", e);
                }
            });
        }
        broadcast("moved");
    }

    @Transactional(readOnly = true)
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
        relativePath = getUniqueFilePath(relativePath);
        saved.setFilePath(relativePath);
        saved = repository.save(saved);
        
        try {
            storage.write(relativePath, saved.getContent() != null ? saved.getContent() : "");
        } catch (IOException e) {
            log.error("Failed to write file for snippet {}: {}", saved.getId(), e.getMessage());
            throw new UncheckedIOException("Failed to write snippet template to disk", e);
        }
        
        broadcast("created");
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Snippet> getAllSnippets() {
        return repository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "lastModified"));
    }

    @Transactional(readOnly = true)
    public java.util.Optional<Snippet> getSnippetById(UUID id) {
        return repository.findById(id);
    }

    private void broadcast(String message) {
        messagingTemplate.convertAndSend("/topic/snippets", message);
    }
}