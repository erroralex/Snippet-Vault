package com.nilsson.controller;

import com.nilsson.dto.*;
import com.nilsson.model.Snippet;
import com.nilsson.repository.SnippetRepository;
import com.nilsson.service.SnippetService;
import jakarta.validation.Valid;

import java.util.List;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

/**
 * ──────────────────────────────────────────────
 * <h2>SnippetController</h2>
 * ──────────────────────────────────────────────
 * <p>
 * <strong>Responsibility:</strong> Exposes a comprehensive REST API for the
 * complete lifecycle management of code snippets.
 * </p>
 * <p>
 * <strong>Functions:</strong>
 * </p>
 * <ul>
 * <li>Provides standard CRUD endpoints for creating, retrieving, updating
 * (content, metadata), and deleting snippets.</li>
 * <li>Supports advanced search functionality, filtering by text content and
 * programming language.</li>
 * <li>Handles organizational actions such as toggling favorite status, updating
 * tags, and managing snippet descriptions.</li>
 * <li>Provides bulk operation endpoints for reordering snippets and moving
 * multiple snippets between folders.</li>
 * <li>Exposes endpoints for retrieving available snippet templates and
 * instantiating new snippets based on those templates.</li>
 * </ul>
 * <p>
 * <strong>Technical Role:</strong> A central Spring {@code @RestController}
 * mapped to {@code /api/snippets}, utilizing {@code SnippetService} and
 * {@code SnippetRepository} to process requests and return standardized JSON
 * responses.
 * </p>
 * ──────────────────────────────────────────────
 */
@Slf4j
@RestController
@RequestMapping("/api/snippets")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SnippetController {

    private final SnippetService snippetService;

    public record SnippetUpdatePayload(String content) {
    }

    public record SnippetCreatePayload(String title, String language) {
    }

    @GetMapping
    public ResponseEntity<List<Snippet>> getAllSnippets() {
        log.debug("REST request to get all Snippets");
        List<Snippet> snippets = snippetService.getAllSnippets();
        return ResponseEntity.ok(snippets);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Snippet> getSnippetById(@PathVariable @NonNull UUID id) {
        log.debug("REST request to get Snippet : {}", id);
        return snippetService.getSnippetById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Snippet> createSnippet(@RequestBody SnippetCreatePayload payload) {
        log.debug("REST request to create a new Snippet with title: '{}' and language: '{}'", payload.title(),
                payload.language());
        Snippet saved = snippetService.createSnippet(payload.title(), payload.language());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateSnippet(@PathVariable String id, @RequestBody SnippetUpdatePayload payload) {
        log.debug("REST request to update Snippet : {}", id);
        snippetService.updateContent(id, payload.content());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/description")
    public ResponseEntity<Void> updateDescription(
            @PathVariable String id,
            @RequestBody UpdateDescriptionRequest req) {
        snippetService.updateDescription(id, req.description());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/rename")
    public ResponseEntity<Void> rename(@PathVariable String id,
            @Valid @RequestBody RenameRequest req) {
        snippetService.rename(id, req.title);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/metadata")
    public ResponseEntity<Void> updateMetadata(
            @PathVariable String id,
            @Valid @RequestBody UpdateMetadataRequest req) {
        snippetService.updateMetadata(id, req.title(), req.language(), req.description());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        snippetService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/tags")
    public ResponseEntity<Void> updateTags(@PathVariable String id,
            @RequestBody TagsRequest req) {
        snippetService.updateTags(id, req.tags);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/search")
    public List<Snippet> search(@RequestParam(required = false) String q,
            @RequestParam(required = false) String language) {
        return snippetService.search(q, language);
    }

    @PatchMapping("/{id}/favorite")
    public ResponseEntity<Void> toggleFavorite(@PathVariable String id) {
        snippetService.toggleFavorite(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/order")
    public ResponseEntity<Void> updateOrder(@RequestBody List<OrderRequest> order) {
        snippetService.updateOrder(order);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/move")
    public ResponseEntity<Void> move(@RequestBody MoveSnippetsRequest req) {
        snippetService.moveSnippets(req.snippetIds(), req.folderId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/templates")
    public List<Snippet> getTemplates() {
        return snippetService.getTemplates();
    }

    @PostMapping("/{id}/create-from-template")
    public Snippet createFromTemplate(@PathVariable String id) {
        return snippetService.createFromTemplate(id);
    }
}
