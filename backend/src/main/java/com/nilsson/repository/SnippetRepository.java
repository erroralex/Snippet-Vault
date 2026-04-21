package com.nilsson.repository;

import com.nilsson.model.Snippet;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * ──────────────────────────────────────────────
 * <h2>SnippetRepository</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Provides data access methods and abstracts database interactions for the {@code Snippet} entity.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Handles standard CRUD operations for snippets against the underlying database.</li>
 * <li>Provides methods to find specific snippets by their corresponding file system path.</li>
 * <li>Supports custom full-text search queries across snippet titles and content using JPQL.</li>
 * <li>Enables filtering and retrieval of snippets by specific criteria such as language, associated folder, or template status.</li>
 * <li>Offers sorted retrieval of all snippets based on defined order and modification date.</li>
 * <li>Provides bulk deletion capabilities for snippets within a specific folder.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A Spring Data JPA {@code @Repository} interface that leverages both method naming conventions and custom {@code @Query} annotations to manage snippet persistence and retrieval.</p>
 * ──────────────────────────────────────────────
 */
@Repository
public interface SnippetRepository extends JpaRepository<Snippet, UUID> {

    Optional<Snippet> findByFilePath(String filePath);

    @Query("SELECT s FROM Snippet s WHERE " +
            "LOWER(s.title) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "s.content LIKE CONCAT('%', :q, '%')")
    List<Snippet> searchByQuery(@Param("q") String q);

    @Query("SELECT s FROM Snippet s WHERE s.language = :language")
    List<Snippet> findByLanguage(@Param("language") String language);

    List<Snippet> findAllByOrderBySortOrderAscLastModifiedDesc();

    List<Snippet> findByFolderId(String folderId);

    void deleteByFolderId(String folderId);

    List<Snippet> findByFolderIdIsNull();

    List<Snippet> findByTemplateTrue();
}