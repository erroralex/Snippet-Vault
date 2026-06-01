package com.nilsson.dto;

public record CreateFolderRequest(String name, String parentId, String color, String icon) {
}
