package com.nilsson.service;

import com.nilsson.dto.CreateFolderRequest;
import com.nilsson.dto.OrderRequest;
import com.nilsson.dto.UpdateFolderRequest;
import com.nilsson.model.Folder;
import com.nilsson.repository.FolderRepository;
import com.nilsson.repository.SnippetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;

/**
 * ──────────────────────────────────────────────
 * <h2>FolderService</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Manages the business logic for organizing and maintaining snippet folders, including their creation, modification, deletion, and reordering.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Handles the creation of new folders based on user requests.</li>
 * <li>Updates existing folder properties such as name, color, icon, and expansion state.</li>
 * <li>Manages the physical file system implications of folder operations, such as moving associated snippet files when a folder is renamed or deleting/reassigning snippets when a folder is removed.</li>
 * <li>Provides mechanisms for reordering folders within the hierarchy.</li>
 * <li>Ensures data consistency between the database representation of folders and their corresponding physical directories.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A Spring {@code @Service} that orchestrates interactions between {@code FolderRepository}, {@code SnippetRepository}, and {@code LocalFileSystemStorage} to provide comprehensive folder management capabilities.</p>
 * ──────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FolderService {

    private final FolderRepository folderRepository;
    private final SnippetRepository snippetRepository;
    private final LocalFileSystemStorage storage;

    public List<Folder> getAll() {
        return folderRepository.findAllByOrderBySortOrderAsc();
    }

    public Folder create(CreateFolderRequest req) {
        return folderRepository.save(
                Folder.builder()
                        .name(req.name())
                        .parentId(req.parentId())
                        .color(req.color())
                        .icon(req.icon() != null ? req.icon() : "📁")
                        .build()
        );
    }

    public void update(String id, UpdateFolderRequest req) {
        Folder f = folderRepository.findById(id).orElseThrow();
        boolean rename = req.name() != null && !req.name().equals(f.getName());

        if (rename) {
            snippetRepository.findByFolderId(id).forEach(s -> {
                String oldPath = s.getFilePath();
                String newPath = FilePathUtils.relativePathFor(req.name(), s.getLanguage(), s.getTitle());
                s.setFilePath(newPath);
                snippetRepository.save(s);
                try {
                    storage.move(oldPath, newPath);
                } catch (IOException e) {
                    log.error("Failed to move file for snippet {}: {}", s.getId(), e.getMessage());
                }
            });
        }

        if (req.name() != null) f.setName(req.name());
        if (req.color() != null) f.setColor(req.color());
        if (req.icon() != null) f.setIcon(req.icon());
        if (req.expanded() != null) f.setExpanded(req.expanded());
        folderRepository.save(f);
    }

    public void delete(String id, boolean moveSnippetsToRoot) {
        if (moveSnippetsToRoot) {
            snippetRepository.findByFolderId(id)
                    .forEach(s -> {
                        String oldPath = s.getFilePath();
                        s.setFolderId(null);
                        String newPath = FilePathUtils.relativePathFor(null, s.getLanguage(), s.getTitle());
                        s.setFilePath(newPath);
                        snippetRepository.save(s);
                        try {
                            storage.move(oldPath, newPath);
                        } catch (IOException e) {
                            log.error("Failed to move file for snippet {}: {}", s.getId(), e.getMessage());
                        }
                    });
        } else {
            snippetRepository.findByFolderId(id).forEach(s -> {
                try {
                    storage.delete(s.getFilePath());
                } catch (IOException e) {
                    log.error("Failed to delete file for snippet {}: {}", s.getId(), e.getMessage());
                }
                snippetRepository.delete(s);
            });
        }
        folderRepository.findByParentId(id)
                .forEach(sub -> delete(sub.getId(), moveSnippetsToRoot));
        folderRepository.deleteById(id);
    }

    public void updateOrder(List<OrderRequest> order) {
        order.forEach(req ->
                folderRepository.findById(req.id()).ifPresent(f -> {
                    f.setSortOrder(req.sortOrder());
                    folderRepository.save(f);
                })
        );
    }
}