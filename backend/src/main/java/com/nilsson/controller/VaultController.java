package com.nilsson.controller;

import com.nilsson.service.LocalFileSystemStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * ──────────────────────────────────────────────
 * <h2>VaultController</h2>
 * ──────────────────────────────────────────────
 * <p>
 * <strong>Responsibility:</strong> Exposes system-level administration
 * utilities for managing the overall state of the user's snippet vault database
 * and physical files.
 * </p>
 * <p>
 * <strong>Functions:</strong>
 * </p>
 * <ul>
 * <li>Compiles all directories, user files, and SQLite databases located within
 * the workspace data root into a single, structured in-memory ZIP archive.</li>
 * <li>Serves the compressed zip file to the client as a high-speed download
 * binary stream, enabling instant data backup and local export.</li>
 * </ul>
 * <p>
 * <strong>Technical Role:</strong> A Spring REST controller mapped to
 * {@code /api/vault}, integrating the {@code LocalFileSystemStorage} service to
 * read and archive directories onto standard HTTP streams.
 * </p>
 * ──────────────────────────────────────────────
 */
@Slf4j
@RestController
@RequestMapping("/api/vault")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VaultController {

    private final LocalFileSystemStorage storage;

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportVault() throws IOException {
        log.info("REST request to export local snippet vault zip archive");
        Path root = storage.getDataRoot();
        if (!Files.exists(root)) {
            return ResponseEntity.notFound().build();
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            Files.walk(root).forEach(path -> {
                if (Files.isDirectory(path))
                    return;
                String relative = root.relativize(path).toString().replace("\\", "/");
                try {
                    zos.putNextEntry(new ZipEntry(relative));
                    zos.write(Files.readAllBytes(path));
                    zos.closeEntry();
                } catch (IOException e) {
                    throw new UncheckedIOException(e);
                }
            });
        } catch (UncheckedIOException e) {
            log.error("Failed to archive snippet files into ZIP", e);
            throw e.getCause();
        }

        byte[] bytes = baos.toByteArray();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"snippet-vault-export.zip\"")
                .contentType(java.util.Objects.requireNonNull(MediaType.APPLICATION_OCTET_STREAM))
                .body(bytes);
    }
}
