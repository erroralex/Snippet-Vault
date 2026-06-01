package com.nilsson.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nilsson.dto.CreateFolderRequest;
import com.nilsson.dto.UpdateFolderRequest;
import com.nilsson.model.Folder;
import com.nilsson.service.FolderService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
public class FolderControllerTest {

    private MockMvc mockMvc;

    @Mock
    private FolderService folderService;

    @InjectMocks
    private FolderController folderController;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private Folder testFolder;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(folderController).build();
        testFolder = Folder.builder()
                .id("test-id")
                .name("Test Folder")
                .color("#ffffff")
                .icon("📁")
                .build();
    }

    @Test
    void testGetAll() throws Exception {
        when(folderService.getAll()).thenReturn(List.of(testFolder));

        mockMvc.perform(get("/api/folders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Test Folder"))
                .andExpect(jsonPath("$[0].id").value("test-id"));

        verify(folderService, times(1)).getAll();
    }

    @Test
    void testCreate() throws Exception {
        CreateFolderRequest req = new CreateFolderRequest("New Folder", null, "#ffffff", "📁");
        when(folderService.create(any(CreateFolderRequest.class))).thenReturn(testFolder);

        mockMvc.perform(post("/api/folders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test Folder"));
    }

    @Test
    void testUpdate() throws Exception {
        UpdateFolderRequest req = new UpdateFolderRequest("Updated", "#000000", "📁", false);

        mockMvc.perform(put("/api/folders/test-id")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        verify(folderService, times(1)).update(eq("test-id"), any(UpdateFolderRequest.class));
    }

    @Test
    void testDelete() throws Exception {
        mockMvc.perform(delete("/api/folders/test-id")
                        .param("moveSnippetsToRoot", "true"))
                .andExpect(status().isNoContent());

        verify(folderService, times(1)).delete("test-id", true);
    }
}
