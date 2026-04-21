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
 * Provides a comprehensive set of data access methods for the Snippet entity.
 * This Spring Data JPA repository is the backbone of snippet data management,
 * offering not only standard CRUD operations but also a rich collection of custom
 * queries. These queries support key application features such as finding
 * snippets by file path, performing full-text search, filtering by language or
 * folder, and retrieving snippets based on their template status.
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
