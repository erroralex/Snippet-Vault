package com.nilsson.service;

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
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SnippetServiceTest {

    @Mock
    private SnippetRepository repository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private LocalFileSystemStorage storage;

    @Mock
    private FolderRepository folderRepository;

    @InjectMocks
    private SnippetService snippetService;

    private Snippet testSnippet;
    private UUID snippetId;

    @BeforeEach
    void setUp() {
        snippetId = UUID.randomUUID();
        testSnippet = Snippet.builder()
                .id(snippetId)
                .title("Test Snippet")
                .language("java")
                .content("public class Test {}")
                .filePath("java/Test_Snippet.java")
                .favorite(false)
                .tags(Collections.emptyList())
                .build();
    }

    @Test
    void testCreateSnippet() throws IOException {
        when(storage.exists(anyString())).thenReturn(false);
        when(repository.save(any(Snippet.class))).thenReturn(testSnippet);

        Snippet created = snippetService.createSnippet("Test Snippet", "java");

        assertNotNull(created);
        verify(repository, times(1)).save(any(Snippet.class));
        verify(storage, times(1)).write(anyString(), eq(""));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/snippets"), anyString());
    }

    @Test
    void testUpdateContent() throws IOException {
        when(repository.findById(snippetId)).thenReturn(Optional.of(testSnippet));

        snippetService.updateContent(snippetId.toString(), "new code content");

        assertEquals("new code content", testSnippet.getContent());
        verify(repository, times(1)).save(testSnippet);
        verify(storage, times(1)).write(eq("java/Test_Snippet.java"), eq("new code content"));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/snippets"), anyString());
    }

    @Test
    void testUpdateMetadata() throws IOException {
        when(repository.findById(snippetId)).thenReturn(Optional.of(testSnippet));
        when(storage.exists("java/Test_Snippet.java")).thenReturn(true);
        when(storage.exists("kotlin/Updated_Snippet.kt")).thenReturn(false);

        snippetService.updateMetadata(snippetId.toString(), "Updated Snippet", "kotlin", "Some desc");

        assertEquals("Updated Snippet", testSnippet.getTitle());
        assertEquals("kotlin", testSnippet.getLanguage());
        assertEquals("Some desc", testSnippet.getDescription());
        verify(repository, times(1)).save(testSnippet);
        verify(storage, times(1)).move(eq("java/Test_Snippet.java"), eq("kotlin/Updated_Snippet.kt"));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/snippets"), anyString());
    }

    @Test
    void testRename() throws IOException {
        when(repository.findById(snippetId)).thenReturn(Optional.of(testSnippet));
        when(storage.exists("java/Test_Snippet.java")).thenReturn(true);
        when(storage.exists("java/Renamed_Snippet.java")).thenReturn(false);

        snippetService.rename(snippetId.toString(), "Renamed Snippet");

        assertEquals("Renamed Snippet", testSnippet.getTitle());
        verify(repository, times(1)).save(testSnippet);
        verify(storage, times(1)).move(eq("java/Test_Snippet.java"), eq("java/Renamed_Snippet.java"));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/snippets"), anyString());
    }

    @Test
    void testDelete() throws IOException {
        when(repository.findById(snippetId)).thenReturn(Optional.of(testSnippet));

        snippetService.delete(snippetId.toString());

        verify(repository, times(1)).deleteById(snippetId);
        verify(storage, times(1)).delete(eq("java/Test_Snippet.java"));
    }

    @Test
    void testToggleFavorite() {
        when(repository.findById(snippetId)).thenReturn(Optional.of(testSnippet));

        snippetService.toggleFavorite(snippetId.toString());

        assertTrue(testSnippet.isFavorite());
        verify(repository, times(1)).save(testSnippet);
    }
}
