package com.nilsson.repository;

import com.nilsson.model.Folder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * ──────────────────────────────────────────────
 * <h2>FolderRepository</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Provides data access methods and abstracts database interactions for the {@code Folder} entity.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Handles standard CRUD (Create, Read, Update, Delete) operations for folders against the underlying relational database.</li>
 * <li>Provides custom query methods to retrieve all folders sorted by their defined sort order, crucial for rendering the folder tree UI.</li>
 * <li>Allows fetching all direct child folders of a specified parent folder to support hierarchical data structures.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A Spring Data JPA {@code @Repository} interface that automatically implements database queries based on method naming conventions, extending {@code JpaRepository} for standard JPA functionality.</p>
 * ──────────────────────────────────────────────
 */
public interface FolderRepository extends JpaRepository<Folder, String> {
    List<Folder> findAllByOrderBySortOrderAsc();

    List<Folder> findByParentId(String parentId);

    java.util.Optional<Folder> findByParentIdAndName(String parentId, String name);

    java.util.Optional<Folder> findByParentIdIsNullAndName(String name);
}