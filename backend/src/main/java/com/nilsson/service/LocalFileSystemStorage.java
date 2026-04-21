package com.nilsson.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

/**
 * ──────────────────────────────────────────────
 * <h2>LocalFileSystemStorage</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Provides a secure and abstracted interface for performing file system operations related to snippet storage.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Manages the root directory for snippet data, ensuring its existence and proper initialization.</li>
 * <li>Handles writing, reading, moving, and deleting snippet files on the local file system.</li>
 * <li>Resolves relative paths securely, preventing path traversal vulnerabilities.</li>
 * <li>Automatically creates necessary parent directories when writing files.</li>
 * <li>Cleans up empty directories after file movements or deletions to maintain a tidy file structure.</li>
 * <li>Provides methods to check for the existence of files.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A Spring {@code @Service} that encapsulates direct file I/O, acting as a robust layer between the application's business logic and the underlying operating system's file system, ensuring data integrity and security.</p>
 * ──────────────────────────────────────────────
 */
@Slf4j
@Service
public class LocalFileSystemStorage {

    private final Path dataRoot;

    public LocalFileSystemStorage(
            @Value("${snippetvault.data-dir:data}") String dataDir) throws IOException {
        log.info("Working directory: {}", Path.of("").toAbsolutePath());
        this.dataRoot = Path.of(dataDir).toAbsolutePath().normalize();
        Files.createDirectories(dataRoot);
        log.info("Snippet data directory: {}", dataRoot);
    }

    public Path getDataRoot() {
        return dataRoot;
    }

    public Path write(String relativePath, String content) throws IOException {
        log.info("WRITE called: {}", relativePath);
        Path target = resolve(relativePath);
        Files.createDirectories(target.getParent());
        Files.writeString(target, content, StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        log.debug("Wrote snippet file: {}", target);
        return target;
    }

    public String read(String relativePath) throws IOException {
        Path target = resolve(relativePath);
        if (!Files.exists(target)) {
            log.warn("Snippet file not found: {}", target);
            return null;
        }
        return Files.readString(target, StandardCharsets.UTF_8);
    }

    public void move(String fromRelative, String toRelative) throws IOException {
        if (fromRelative == null || fromRelative.equals(toRelative)) return;
        Path source = resolve(fromRelative);
        Path target = resolve(toRelative);
        if (!Files.exists(source)) {
            log.warn("Move skipped — source file not found: {}", source);
            return;
        }
        Files.createDirectories(target.getParent());
        Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        log.debug("Moved snippet file: {} -> {}", source, target);
        cleanupEmptyDirs(source.getParent());
    }

    public void delete(String relativePath) throws IOException {
        if (relativePath == null) return;
        Path target = resolve(relativePath);
        Files.deleteIfExists(target);
        log.debug("Deleted snippet file: {}", target);
        cleanupEmptyDirs(target.getParent());
    }

    public boolean exists(String relativePath) {
        return relativePath != null && Files.exists(resolve(relativePath));
    }

    public Path resolve(String relativePath) {
        Path resolved = dataRoot.resolve(relativePath).normalize();
        if (!resolved.startsWith(dataRoot)) {
            throw new SecurityException(
                    "Path traversal attempt: " + relativePath);
        }
        return resolved;
    }

    private void cleanupEmptyDirs(Path dir) {
        try {
            while (dir != null && !dir.equals(dataRoot)) {
                if (Files.isDirectory(dir) && isDirectoryEmpty(dir)) {
                    Files.delete(dir);
                    log.debug("Removed empty directory: {}", dir);
                    dir = dir.getParent();
                } else {
                    break;
                }
            }
        } catch (IOException e) {
            log.warn("Could not clean up empty directory: {}", dir, e);
        }
    }

    private boolean isDirectoryEmpty(Path dir) throws IOException {
        try (var stream = Files.newDirectoryStream(dir)) {
            return !stream.iterator().hasNext();
        }
    }
}