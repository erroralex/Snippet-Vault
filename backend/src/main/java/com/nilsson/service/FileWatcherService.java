package com.nilsson.service;

import com.nilsson.repository.SnippetRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import static java.nio.file.StandardWatchEventKinds.*;

/**
 * ──────────────────────────────────────────────
 * <h2>FileWatcherService</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Monitors the local file system for external changes to snippet files and synchronizes them with the application's database and connected clients.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Initializes and manages a background daemon thread that recursively watches a designated data directory.</li>
 * <li>Detects file creation, modification, and deletion events using Java NIO's {@code WatchService} API.</li>
 * <li>Debounces file modification events to prevent excessive processing.</li>
 * <li>Reads updated content from externally modified snippet files.</li>
 * <li>Updates the corresponding snippet entities in the database with the new content.</li>
 * <li>Broadcasts WebSocket messages to connected UI clients to trigger real-time updates, enabling a seamless "edit-on-disk" workflow.</li>
 * <li>Handles the registration of new directories created within the watched hierarchy.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A Spring {@code @Service} that leverages {@code WatchService} and a scheduled executor to provide asynchronous, real-time synchronization between the file system and the application's internal state, interacting with {@code LocalFileSystemStorage}, {@code SnippetRepository}, and {@code SimpMessagingTemplate}.</p>
 * ──────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileWatcherService {

    private final LocalFileSystemStorage storage;
    private final SnippetRepository snippetRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final com.nilsson.repository.FolderRepository folderRepository;

    private WatchService watchService;
    private final ScheduledExecutorService executor =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "file-watcher");
                t.setDaemon(true);
                return t;
            });

    public void start() throws IOException {
        watchService = FileSystems.getDefault().newWatchService();
        registerAll(storage.getDataRoot());
        executor.submit(this::watchLoop);
        log.info("FileWatcherService started, watching: {}", storage.getDataRoot());
    }

    @PreDestroy
    public void stop() {
        executor.shutdownNow();
        try {
            if (watchService != null) watchService.close();
        } catch (IOException ignored) {
        }
    }

    private void registerAll(Path dir) throws IOException {
        Files.walk(dir)
                .filter(Files::isDirectory)
                .forEach(d -> {
                    try {
                        d.register(watchService, ENTRY_CREATE, ENTRY_MODIFY, ENTRY_DELETE);
                    } catch (IOException e) {
                        log.warn("Could not watch directory: {}", d, e);
                    }
                });
    }

    private void watchLoop() {
        while (!Thread.currentThread().isInterrupted()) {
            WatchKey key;
            try {
                key = watchService.take();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (ClosedWatchServiceException e) {
                break;
            }

            for (WatchEvent<?> event : key.pollEvents()) {
                WatchEvent.Kind<?> kind = event.kind();
                if (kind == OVERFLOW) continue;

                Path dir = (Path) key.watchable();
                Path fileName = (Path) event.context();
                Path absolute = dir.resolve(fileName);
                String relative = storage.getDataRoot()
                        .relativize(absolute).toString()
                        .replace("\\", "/");

                // Skip database files, application logs, and system/hidden files
                if (relative.equals("snippet-vault.db") ||
                    relative.equals("app.log") ||
                    relative.endsWith("-journal") ||
                    relative.endsWith("-wal") ||
                    relative.endsWith("-shm") ||
                    relative.startsWith(".") ||
                    relative.contains("/.")) {
                    continue;
                }

                if (kind == ENTRY_MODIFY) {
                    executor.schedule(
                            () -> handleModify(relative),
                            200, TimeUnit.MILLISECONDS
                    );
                } else if (kind == ENTRY_CREATE) {
                    if (Files.isDirectory(absolute)) {
                        try {
                            absolute.register(watchService, ENTRY_CREATE, ENTRY_MODIFY, ENTRY_DELETE);
                        } catch (IOException e) {
                            log.warn("Could not register new directory: {}", absolute, e);
                        }
                    } else {
                        executor.schedule(
                                () -> handleCreate(relative),
                                200, TimeUnit.MILLISECONDS
                        );
                    }
                } else if (kind == ENTRY_DELETE) {
                    executor.schedule(
                            () -> handleDelete(relative),
                            200, TimeUnit.MILLISECONDS
                    );
                }
            }

            if (!key.reset()) {
                log.warn("Watch key no longer valid for: {}", key.watchable());
                key.cancel();
            }
        }
    }

    private void handleModify(String relativePath) {
        snippetRepository.findByFilePath(relativePath).ifPresent(snippet -> {
            try {
                String content = storage.read(relativePath);
                if (content != null && !content.equals(snippet.getContent())) {
                    snippet.setContent(content);
                    snippetRepository.save(snippet);
                    messagingTemplate.convertAndSend("/topic/snippets",
                            "external-update:" + snippet.getId());
                    log.info("Synced external edit for snippet: {}", snippet.getTitle());
                }
            } catch (IOException e) {
                log.error("Failed to sync external edit for {}: {}", relativePath, e.getMessage());
            }
        });
    }

    private void handleDelete(String relativePath) {
        snippetRepository.findByFilePath(relativePath).ifPresent(snippet -> {
            snippetRepository.delete(snippet);
            messagingTemplate.convertAndSend("/topic/snippets", "external-delete:" + snippet.getId());
            log.info("Synced external delete for snippet: {}", snippet.getTitle());
        });
    }

    private void handleCreate(String relativePath) {
        if (snippetRepository.findByFilePath(relativePath).isEmpty()) {
            try {
                String content = storage.read(relativePath);
                Path absolute = storage.resolve(relativePath);
                String filename = absolute.getFileName().toString();
                int dotIndex = filename.lastIndexOf('.');
                String title = dotIndex == -1 ? filename : filename.substring(0, dotIndex);
                String ext = dotIndex == -1 ? "" : filename.substring(dotIndex + 1);

                String language = getLanguageFromExtension(ext);
                String folderId = resolveFolderIdFromPath(absolute.getParent());

                com.nilsson.model.Snippet newSnippet = com.nilsson.model.Snippet.builder()
                        .id(java.util.UUID.randomUUID())
                        .title(title)
                        .language(language)
                        .content(content != null ? content : "")
                        .filePath(relativePath)
                        .folderId(folderId)
                        .lastModified(java.time.Instant.now())
                        .build();

                snippetRepository.save(newSnippet);
                messagingTemplate.convertAndSend("/topic/snippets", "external-create:" + newSnippet.getId());
                log.info("Synced external create for snippet: {} (lang: {})", title, language);
            } catch (IOException e) {
                log.error("Failed to read created file {}: {}", relativePath, e.getMessage());
            }
        }
    }

    private String getLanguageFromExtension(String ext) {
        if (ext == null || ext.isBlank()) return "text";
        return switch (ext.toLowerCase()) {
            case "java" -> "java";
            case "ts" -> "typescript";
            case "js" -> "javascript";
            case "py" -> "python";
            case "html" -> "html";
            case "css" -> "css";
            case "scss" -> "scss";
            case "sql" -> "sql";
            case "json" -> "json";
            case "md" -> "markdown";
            case "kt" -> "kotlin";
            case "rs" -> "rust";
            case "go" -> "go";
            case "cs" -> "csharp";
            case "php" -> "php";
            case "rb" -> "ruby";
            case "swift" -> "swift";
            case "sh" -> "bash";
            case "dockerfile" -> "dockerfile";
            case "yml", "yaml" -> "yaml";
            case "xml" -> "xml";
            default -> ext.toLowerCase();
        };
    }

    private String resolveFolderIdFromPath(Path parentPath) {
        if (parentPath == null) {
            return null;
        }
        Path dataRoot = storage.getDataRoot();
        if (!parentPath.startsWith(dataRoot)) {
            return null;
        }
        Path relative = dataRoot.relativize(parentPath);
        if (relative.toString().isEmpty() || relative.toString().equals(".")) {
            return null;
        }

        java.util.List<String> folderSegments = new java.util.ArrayList<>();
        for (int i = 0; i < relative.getNameCount(); i++) {
            folderSegments.add(relative.getName(i).toString());
        }

        if (folderSegments.isEmpty()) {
            return null;
        }

        String parentId = null;
        for (String segmentName : folderSegments) {
            java.util.Optional<com.nilsson.model.Folder> folderOpt = parentId == null 
                ? folderRepository.findByParentIdIsNullAndName(segmentName)
                : folderRepository.findByParentIdAndName(parentId, segmentName);
            com.nilsson.model.Folder folder = folderOpt.orElse(null);

            if (folder == null) {
                folder = folderRepository.save(
                        com.nilsson.model.Folder.builder()
                                .name(segmentName)
                                .parentId(parentId)
                                .icon("📁")
                                .expanded(true)
                                .build()
                );
                messagingTemplate.convertAndSend("/topic/folders", "updated");
            }
            parentId = folder.getId();
        }
        return parentId;
    }
}