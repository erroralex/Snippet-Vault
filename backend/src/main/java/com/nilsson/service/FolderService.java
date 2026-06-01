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
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    public List<Folder> getAll() {
        return folderRepository.findAllByOrderBySortOrderAsc();
    }

    public Folder create(CreateFolderRequest req) {
        Folder saved = folderRepository.save(
                Folder.builder()
                        .name(req.name())
                        .parentId(req.parentId())
                        .color(req.color())
                        .icon(req.icon() != null ? req.icon() : "📁")
                        .build()
        );
        broadcast();
        return saved;
    }

    public void update(String id, UpdateFolderRequest req) {
        Folder f = folderRepository.findById(id).orElseThrow();
        boolean rename = req.name() != null && !req.name().equals(f.getName());

        if (rename) {
            f.setName(req.name());
            folderRepository.save(f);
            updateDescendantSnippetsPaths(id);
        }

        if (req.color() != null) f.setColor(req.color());
        if (req.icon() != null) f.setIcon(req.icon());
        if (req.expanded() != null) f.setExpanded(req.expanded());
        folderRepository.save(f);
        broadcast();
    }

    public void delete(String id, boolean moveSnippetsToRoot) {
        if (moveSnippetsToRoot) {
            snippetRepository.findByFolderId(id)
                    .forEach(s -> {
                        String oldPath = s.getFilePath();
                        s.setFolderId(null);
                        String newPath = FilePathUtils.relativePathFor(null, s.getLanguage(), s.getTitle());
                        if (oldPath != null && !oldPath.equals(newPath)) {
                            newPath = getUniqueFilePath(newPath);
                        }
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
        broadcast();
    }

    public void updateOrder(List<OrderRequest> order) {
        order.forEach(req ->
                folderRepository.findById(req.id()).ifPresent(f -> {
                    f.setSortOrder(req.sortOrder());
                    folderRepository.save(f);
                })
        );
        broadcast();
    }

    private String buildFolderPath(String folderId) {
        if (folderId == null || folderId.isBlank()) {
            return "";
        }
        List<String> segments = new java.util.ArrayList<>();
        String currentId = folderId;
        while (currentId != null && !currentId.isBlank()) {
            Folder f = folderRepository.findById(currentId).orElse(null);
            if (f == null) break;
            segments.add(0, FilePathUtils.sanitiseTitle(f.getName()));
            currentId = f.getParentId();
        }
        return String.join("/", segments);
    }

    private String buildSnippetRelativePath(com.nilsson.model.Snippet s) {
        String folderPath = buildFolderPath(s.getFolderId());
        return FilePathUtils.relativePathFor(folderPath, s.getLanguage(), s.getTitle());
    }

    private String getUniqueFilePath(String relativePath) {
        if (!storage.exists(relativePath)) {
            return relativePath;
        }
        int dotIndex = relativePath.lastIndexOf('.');
        String base = dotIndex == -1 ? relativePath : relativePath.substring(0, dotIndex);
        String ext = dotIndex == -1 ? "" : relativePath.substring(dotIndex);
        int counter = 1;
        while (true) {
            String candidate = base + "_" + counter + ext;
            if (!storage.exists(candidate)) {
                return candidate;
            }
            counter++;
        }
    }

    private void updateDescendantSnippetsPaths(String folderId) {
        snippetRepository.findByFolderId(folderId).forEach(s -> {
            String oldPath = s.getFilePath();
            String newPath = buildSnippetRelativePath(s);
            if (oldPath != null && !oldPath.equals(newPath)) {
                newPath = getUniqueFilePath(newPath);
                s.setFilePath(newPath);
                snippetRepository.save(s);
                try {
                    storage.move(oldPath, newPath);
                } catch (IOException e) {
                    log.error("Failed to move snippet file on folder path change: {}", e.getMessage());
                }
            }
        });
        folderRepository.findByParentId(folderId).forEach(child -> {
            updateDescendantSnippetsPaths(child.getId());
        });
    }

    private void broadcast() {
        messagingTemplate.convertAndSend("/topic/folders", "updated");
    }
}