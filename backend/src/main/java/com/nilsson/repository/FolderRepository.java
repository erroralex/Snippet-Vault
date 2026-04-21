package com.nilsson.repository;

import com.nilsson.model.Folder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Provides data access methods for the Folder entity. This Spring Data JPA
 * repository interface handles all database operations for folders, such as
 * saving, deleting, and retrieving. It includes custom query methods for
 * fetching all folders sorted by their defined order and for finding all direct
 * children of a given parent folder, which are essential for building the
 * hierarchical folder structure in the UI.
 */
public interface FolderRepository extends JpaRepository<Folder, String> {
    List<Folder> findAllByOrderBySortOrderAsc();

    List<Folder> findByParentId(String parentId);
}
