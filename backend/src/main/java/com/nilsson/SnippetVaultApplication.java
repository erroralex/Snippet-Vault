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

import com.nilsson.service.FileWatcherService;

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
    private final FileWatcherService fileWatcherService;

    public static void main(String[] args) {
        System.out.println("[SnippetVault] Working directory: " + new java.io.File("").getAbsolutePath());
        System.out.println("[SnippetVault] Args: " + java.util.Arrays.toString(args));

        boolean hasDataDirArg = false;
        for (String arg : args) {
            if (arg.startsWith("--snippetvault.data-dir=")) {
                hasDataDirArg = true;
                String val = arg.substring(arg.indexOf('=') + 1);
                System.out.println("[SnippetVault] data-dir from arg: " + val);
                // Normalize and resolve to absolute path
                java.io.File dataFile = new java.io.File(val);
                String resolved = dataFile.getAbsolutePath();
                System.out.println("[SnippetVault] data-dir resolved: " + resolved);
                System.setProperty("snippetvault.data-dir", resolved);
                dataFile.mkdirs();
                break;
            }
        }

        if (!hasDataDirArg) {
            java.io.File workingDir = new java.io.File("").getAbsoluteFile();
            System.out.println("[SnippetVault] No data-dir arg. Working dir: " + workingDir);
            if (workingDir.getName().equals("backend")) {
                System.setProperty("snippetvault.data-dir", "../data");
                new java.io.File("../data").mkdirs();
            } else {
                System.setProperty("snippetvault.data-dir", "data");
                new java.io.File("data").mkdirs();
            }
        }

        System.out.println("[SnippetVault] Final snippetvault.data-dir property: " + System.getProperty("snippetvault.data-dir"));
        SpringApplication.run(SnippetVaultApplication.class, args);
    }

    private String buildFolderPath(String folderId) {
        if (folderId == null || folderId.isBlank()) {
            return null;
        }
        java.util.List<String> segments = new java.util.ArrayList<>();
        String currentId = folderId;
        while (currentId != null && !currentId.isBlank()) {
            Folder f = folderRepository.findById(currentId).orElse(null);
            if (f == null) break;
            segments.add(0, FilePathUtils.sanitiseTitle(f.getName()));
            currentId = f.getParentId();
        }
        return segments.isEmpty() ? null : String.join("/", segments);
    }

    private String buildRelativePath(Snippet snippet) {
        String folderPath = buildFolderPath(snippet.getFolderId());
        String path = FilePathUtils.relativePathFor(
                folderPath, snippet.getLanguage(), snippet.getTitle());
        log.debug("Resolved path for '{}': {}", snippet.getTitle(), path);
        return path;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void syncFilesOnStartup() throws IOException {
        // 1. Scan and import any untracked files first
        importUntrackedFiles();

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

        // 2. Start file watcher after sync is fully completed to avoid database lock/echo loops
        try {
            fileWatcherService.start();
        } catch (Exception e) {
            log.error("Failed to start FileWatcherService on startup", e);
        }
    }

    private void importUntrackedFiles() {
        log.info("Scanning for untracked files to import...");
        java.nio.file.Path dataRoot = storage.getDataRoot();
        int imported = 0;

        try (var stream = java.nio.file.Files.walk(dataRoot)) {
            java.util.List<java.nio.file.Path> files = stream
                    .filter(java.nio.file.Files::isRegularFile)
                    .toList();

            for (java.nio.file.Path path : files) {
                try {
                    String relativePath = dataRoot.relativize(path).toString().replace("\\", "/");

                    // Skip database files, application logs, and hidden/system files
                    if (relativePath.equals("snippet-vault.db") ||
                        relativePath.equals("app.log") ||
                        relativePath.endsWith("-journal") ||
                        relativePath.endsWith("-wal") ||
                        relativePath.endsWith("-shm") ||
                        relativePath.startsWith(".") ||
                        relativePath.contains("/.")) {
                        continue;
                    }

                    if (repository.findByFilePath(relativePath).isEmpty()) {
                        log.info("Importing untracked file: {}", relativePath);
                        String content = java.nio.file.Files.readString(path, java.nio.charset.StandardCharsets.UTF_8);
                        String filename = path.getFileName().toString();
                        int dotIndex = filename.lastIndexOf('.');
                        String title = dotIndex == -1 ? filename : filename.substring(0, dotIndex);
                        String ext = dotIndex == -1 ? "" : filename.substring(dotIndex + 1);

                        String language = getLanguageFromExtension(ext);
                        String folderId = resolveFolderIdFromPath(path.getParent());

                        Snippet newSnippet = Snippet.builder()
                                .id(java.util.UUID.randomUUID())
                                .title(title)
                                .language(language)
                                .content(content != null ? content : "")
                                .filePath(relativePath)
                                .folderId(folderId)
                                .lastModified(java.time.Instant.now())
                                .build();

                        repository.save(newSnippet);
                        imported++;
                        log.info("Successfully imported snippet: {} (lang: {})", title, language);
                    }
                } catch (IOException e) {
                    log.error("Failed to import untracked file: " + path, e);
                }
            }
        } catch (IOException e) {
            log.error("Failed to walk data root directory", e);
        }

        log.info("Import scan complete — imported {} new snippets", imported);
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

    private String resolveFolderIdFromPath(java.nio.file.Path parentPath) {
        if (parentPath == null) {
            return null;
        }
        java.nio.file.Path dataRoot = storage.getDataRoot();
        if (!parentPath.startsWith(dataRoot)) {
            return null;
        }
        java.nio.file.Path relative = dataRoot.relativize(parentPath);
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
            java.util.Optional<Folder> folderOpt = parentId == null
                    ? folderRepository.findByParentIdIsNullAndName(segmentName)
                    : folderRepository.findByParentIdAndName(parentId, segmentName);
            Folder folder = folderOpt.orElse(null);

            if (folder == null) {
                folder = folderRepository.save(
                        Folder.builder()
                                .name(segmentName)
                                .parentId(parentId)
                                .icon("📁")
                                .expanded(true)
                                .build()
                );
            }
            parentId = folder.getId();
        }
        return parentId;
    }
}