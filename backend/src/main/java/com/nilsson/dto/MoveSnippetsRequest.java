package com.nilsson.dto;

import java.util.List;

public record MoveSnippetsRequest(List<String> snippetIds, String folderId) {}
