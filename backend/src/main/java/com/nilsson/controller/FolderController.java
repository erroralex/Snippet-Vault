package com.nilsson.controller;

import com.nilsson.dto.CreateFolderRequest;
import com.nilsson.dto.OrderRequest;
import com.nilsson.dto.UpdateFolderRequest;
import com.nilsson.model.Folder;
import com.nilsson.service.FolderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ──────────────────────────────────────────────
 * <h2>FolderController</h2>
 * ──────────────────────────────────────────────
 * <p>
 * <strong>Responsibility:</strong> Exposes a REST API for managing the
 * creation, retrieval, modification, and deletion of snippet folders.
 * </p>
 * <p>
 * <strong>Functions:</strong>
 * </p>
 * <ul>
 * <li>Provides endpoints to fetch all folders for rendering the folder tree in
 * the UI.</li>
 * <li>Handles requests to create new folders via HTTP POST.</li>
 * <li>Supports updating existing folder metadata (name, color, icon, etc.) via
 * HTTP PUT.</li>
 * <li>Manages folder deletion via HTTP DELETE, including options to keep or
 * delete associated snippets.</li>
 * <li>Allows reordering of the folder hierarchy via a dedicated bulk update
 * endpoint.</li>
 * </ul>
 * <p>
 * <strong>Technical Role:</strong> A Spring {@code @RestController} mapped to
 * {@code /api/folders}, utilizing constructor injection via Lombok's
 * {@code @RequiredArgsConstructor} to interact with the {@code FolderService}
 * for executing business logic.
 * </p>
 * ──────────────────────────────────────────────
 */
@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FolderController {

    private final FolderService folderService;

    @GetMapping
    public List<Folder> getAll() {
        return folderService.getAll();
    }

    @PostMapping
    public Folder create(@RequestBody CreateFolderRequest req) {
        return folderService.create(req);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> update(
            @PathVariable String id,
            @RequestBody UpdateFolderRequest req) {
        folderService.update(id, req);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String id,
            @RequestParam(defaultValue = "false") boolean moveSnippetsToRoot) {
        folderService.delete(id, moveSnippetsToRoot);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/order")
    public ResponseEntity<Void> updateOrder(@RequestBody List<OrderRequest> order) {
        folderService.updateOrder(order);
        return ResponseEntity.ok().build();
    }
}