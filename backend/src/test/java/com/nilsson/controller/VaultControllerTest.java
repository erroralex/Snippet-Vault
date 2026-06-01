package com.nilsson.controller;

import com.nilsson.service.LocalFileSystemStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
public class VaultControllerTest {

    private MockMvc mockMvc;

    @Mock
    private LocalFileSystemStorage storage;

    @InjectMocks
    private VaultController vaultController;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(vaultController).build();
    }

    @Test
    void testExportVault_Exists() throws Exception {
        Path textFile = tempDir.resolve("test.txt");
        Files.writeString(textFile, "Hello World");

        when(storage.getDataRoot()).thenReturn(tempDir);

        mockMvc.perform(get("/api/vault/export"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"snippet-vault-export.zip\""))
                .andExpect(content().contentType("application/octet-stream"));

        verify(storage, times(1)).getDataRoot();
    }

    @Test
    void testExportVault_NotExists() throws Exception {
        when(storage.getDataRoot()).thenReturn(Path.of("non-existent-directory-xyz-123"));

        mockMvc.perform(get("/api/vault/export"))
                .andExpect(status().isNotFound());
    }
}
