package com.nilsson.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nilsson.model.Snippet;
import com.nilsson.service.SnippetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
public class SnippetControllerTest {

    private MockMvc mockMvc;

    @Mock
    private SnippetService snippetService;

    @InjectMocks
    private SnippetController snippetController;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private Snippet testSnippet;
    private UUID snippetId;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(snippetController).build();
        snippetId = UUID.randomUUID();
        testSnippet = Snippet.builder()
                .id(snippetId)
                .title("Test Snippet")
                .language("java")
                .content("public class Test {}")
                .favorite(false)
                .build();
    }

    @Test
    void testGetAllSnippets() throws Exception {
        when(snippetService.getAllSnippets()).thenReturn(List.of(testSnippet));

        mockMvc.perform(get("/api/snippets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Test Snippet"))
                .andExpect(jsonPath("$[0].language").value("java"));

        verify(snippetService, times(1)).getAllSnippets();
    }

    @Test
    void testGetSnippetById_Found() throws Exception {
        when(snippetService.getSnippetById(snippetId)).thenReturn(Optional.of(testSnippet));

        mockMvc.perform(get("/api/snippets/" + snippetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Test Snippet"));
    }

    @Test
    void testGetSnippetById_NotFound() throws Exception {
        when(snippetService.getSnippetById(snippetId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/snippets/" + snippetId))
                .andExpect(status().isNotFound());
    }

    @Test
    void testCreateSnippet() throws Exception {
        SnippetController.SnippetCreatePayload payload = new SnippetController.SnippetCreatePayload("New Snippet", "java");
        when(snippetService.createSnippet("New Snippet", "java")).thenReturn(testSnippet);

        mockMvc.perform(post("/api/snippets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Test Snippet"));
    }

    @Test
    void testUpdateSnippet() throws Exception {
        SnippetController.SnippetUpdatePayload payload = new SnippetController.SnippetUpdatePayload("new content");

        mockMvc.perform(put("/api/snippets/" + snippetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        verify(snippetService, times(1)).updateContent(snippetId.toString(), "new content");
    }

    @Test
    void testDeleteSnippet() throws Exception {
        mockMvc.perform(delete("/api/snippets/" + snippetId))
                .andExpect(status().isNoContent());

        verify(snippetService, times(1)).delete(snippetId.toString());
    }
}
