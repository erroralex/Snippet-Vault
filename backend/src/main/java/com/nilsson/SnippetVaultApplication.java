package com.nilsson;

import com.nilsson.model.Folder;
import com.nilsson.model.Snippet;
import com.nilsson.repository.FolderRepository;
import com.nilsson.repository.SnippetRepository;
import com.nilsson.service.FilePathUtils;
import com.nilsson.service.LocalFileSystemStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

import java.io.IOException;

/**
 * ──────────────────────────────────────────────
 * <h2>SnippetVaultApplication</h2>
 * ──────────────────────────────────────────────
 * <p>
 * <strong>Responsibility:</strong> Serves as the entry point for the
 * SnippetVault backend application and orchestrates initial data
 * synchronization.
 * </p>
 * <p>
 * <strong>Functions:</strong>
 * </p>
 * <ul>
 * <li>Initializes and runs the Spring Boot application.</li>
 * <li>Performs a crucial startup synchronization between the database-managed
 * snippet metadata and their physical file representations on disk.</li>
 * <li>Ensures that all snippets in the database have a corresponding file on
 * the file system, creating them if missing.</li>
 * <li>Detects and reconciles external changes made to snippet files on disk,
 * updating the database content accordingly.</li>
 * <li>Recreates missing snippet files if they were deleted externally but still
 * exist in the database.</li>
 * </ul>
 * <p>
 * <strong>Technical Role:</strong> The main Spring Boot application class,
 * responsible for bootstrapping the application context and ensuring data
 * consistency between the persistence layer and the file system upon startup,
 * interacting with {@code SnippetRepository}, {@code FolderRepository}, and
 * {@code LocalFileSystemStorage}.
 * </p>
 * ──────────────────────────────────────────────
 */
@Slf4j
@RequiredArgsConstructor
@SpringBootApplication
public class SnippetVaultApplication {

    private final SnippetRepository repository;
    private final LocalFileSystemStorage storage;
    private final FolderRepository folderRepository;

    public static void main(String[] args) {
        java.io.File workingDir = new java.io.File("").getAbsoluteFile();
        if (workingDir.getName().equals("backend")) {
            System.setProperty("snippetvault.data-dir", "../data");
            new java.io.File("../data").mkdirs();
        } else {
            System.setProperty("snippetvault.data-dir", "data");
            new java.io.File("data").mkdirs();
        }
        SpringApplication.run(SnippetVaultApplication.class, args);
    }

    private String buildRelativePath(Snippet snippet) {
        String folderName = null;
        String folderId = snippet.getFolderId();
        if (folderId != null && !folderId.isBlank()) {
            folderName = folderRepository.findById(folderId)
                    .map(Folder::getName)
                    .orElse(null);
        }
        String path = FilePathUtils.relativePathFor(
                folderName, snippet.getLanguage(), snippet.getTitle());
        log.debug("Resolved path for '{}': {}", snippet.getTitle(), path);
        return path;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void syncFilesOnStartup() throws IOException {
        log.info("Syncing snippet files with database...");
        int written = 0, synced = 0, missing = 0;

        for (Snippet snippet : repository.findAll()) {
            if (snippet.getFilePath() == null) {
                String path = buildRelativePath(snippet);
                storage.write(path, snippet.getContent() != null ? snippet.getContent() : "");
                snippet.setFilePath(path);
                repository.save(snippet);
                written++;

            } else if (!storage.exists(snippet.getFilePath())) {
                storage.write(snippet.getFilePath(),
                        snippet.getContent() != null ? snippet.getContent() : "");
                log.warn("Recreated missing file: {}", snippet.getFilePath());
                missing++;

            } else {
                String fileContent = storage.read(snippet.getFilePath());
                if (fileContent != null && !fileContent.equals(snippet.getContent())) {
                    snippet.setContent(fileContent);
                    repository.save(snippet);
                    synced++;
                    log.info("Synced external changes for: {}", snippet.getTitle());
                }
            }
        }

        log.info("Startup sync complete — written: {}, synced from disk: {}, recreated: {}",
                written, synced, missing);
    }
}