package com.nilsson.service;

import com.nilsson.dto.CreateFolderRequest;
import com.nilsson.dto.UpdateFolderRequest;
import com.nilsson.model.Folder;
import com.nilsson.model.Snippet;
import com.nilsson.repository.FolderRepository;
import com.nilsson.repository.SnippetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class FolderServiceTest {

    @Mock
    private FolderRepository folderRepository;

    @Mock
    private SnippetRepository snippetRepository;

    @Mock
    private LocalFileSystemStorage storage;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private FolderService folderService;

    private Folder testFolder;

    @BeforeEach
    void setUp() {
        testFolder = Folder.builder()
                .id("test-folder-id")
                .name("Test Folder")
                .parentId(null)
                .color("#ffffff")
                .icon("📁")
                .sortOrder(0)
                .build();
    }

    @Test
    void testGetAll() {
        when(folderRepository.findAllByOrderBySortOrderAsc()).thenReturn(List.of(testFolder));

        List<Folder> result = folderService.getAll();

        assertEquals(1, result.size());
        assertEquals("Test Folder", result.get(0).getName());
        verify(folderRepository, times(1)).findAllByOrderBySortOrderAsc();
    }

    @Test
    void testCreate() {
        CreateFolderRequest req = new CreateFolderRequest("New Folder", null, "#000000", "📁");
        when(folderRepository.save(any(Folder.class))).thenReturn(testFolder);

        Folder created = folderService.create(req);

        assertNotNull(created);
        assertEquals("Test Folder", created.getName());
        verify(folderRepository, times(1)).save(any(Folder.class));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/folders"), eq("updated"));
    }

    @Test
    void testUpdate_rename() {
        UpdateFolderRequest req = new UpdateFolderRequest("Updated Folder Name", null, null, null);
        when(folderRepository.findById("test-folder-id")).thenReturn(Optional.of(testFolder));
        when(folderRepository.save(any(Folder.class))).thenReturn(testFolder);
        when(snippetRepository.findByFolderId("test-folder-id")).thenReturn(Collections.emptyList());

        folderService.update("test-folder-id", req);

        assertEquals("Updated Folder Name", testFolder.getName());
        verify(folderRepository, times(2)).save(testFolder);
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/folders"), eq("updated"));
    }

    @Test
    void testDelete_moveSnippetsToRoot() throws IOException {
        Snippet snippet = Snippet.builder()
                .id(UUID.randomUUID())
                .title("My Snippet")
                .language("java")
                .folderId("test-folder-id")
                .filePath("Test_Folder/java/My_Snippet.java")
                .build();

        when(snippetRepository.findByFolderId("test-folder-id")).thenReturn(List.of(snippet));
        when(storage.exists(anyString())).thenReturn(false);

        folderService.delete("test-folder-id", true);

        assertNull(snippet.getFolderId());
        verify(snippetRepository, times(1)).save(snippet);
        verify(storage, times(1)).move(eq("Test_Folder/java/My_Snippet.java"), anyString());
        verify(folderRepository, times(1)).deleteById("test-folder-id");
    }
}
