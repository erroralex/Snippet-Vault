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
import org.springframework.web.bind.annotation.*;

/**
 * Exposes a comprehensive REST API for managing snippets. This controller is the
 * central hub for all snippet-related operations, providing endpoints for
 * creating, retrieving, updating, and deleting snippets. It also includes
 * functionality for searching, managing metadata like tags and descriptions,
 * handling favorites, reordering, and organizing snippets into folders.
 */
@Slf4j
@RestController
@RequestMapping("/api/snippets")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class SnippetController {

    private final SnippetRepository snippetRepository;
    private final SnippetService snippetService;

    public record SnippetUpdatePayload(String content) {
    }

    public record SnippetCreatePayload(String title, String language) {
    }

    @GetMapping
    public ResponseEntity<List<Snippet>> getAllSnippets() {
        log.debug("REST request to get all Snippets");
        List<Snippet> snippets = snippetRepository.findAll(Sort.by(Sort.Direction.DESC, "lastModified"));
        return ResponseEntity.ok(snippets);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Snippet> getSnippetById(@PathVariable UUID id) {
        log.debug("REST request to get Snippet : {}", id);
        return snippetRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Snippet> createSnippet(@RequestBody SnippetCreatePayload payload) {
        log.debug("REST request to create a new Snippet with title: '{}' and language: '{}'", payload.title(), payload.language());
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