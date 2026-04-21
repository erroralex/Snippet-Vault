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
 * Exposes a REST API for managing folders. This controller provides a set of
 * endpoints for performing CRUD (Create, Read, Update, Delete) operations on
 * folders, as well as reordering them. It serves as the primary interface for
 * the frontend to interact with folder-related data, enabling a structured and
 * organized view of snippets within the application.
 */
@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
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
