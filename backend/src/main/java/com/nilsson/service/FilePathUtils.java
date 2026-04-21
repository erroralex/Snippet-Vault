package com.nilsson.service;

import java.util.Map;

/**
 * ──────────────────────────────────────────────
 * <h2>FilePathUtils</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Provides utility methods for constructing, sanitizing, and managing file paths associated with code snippets.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Maps language identifiers to appropriate file extensions.</li>
 * <li>Sanitizes snippet titles by removing illegal characters and formatting them for safe use in file names across various operating systems.</li>
 * <li>Constructs structured relative file paths based on snippet metadata, including folder assignments and programming language.</li>
 * <li>Ensures consistency between the logical data structure in the database and the physical file system storage.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A stateless utility class designed to centralize file path logic, promoting data integrity and system robustness.</p>
 * ──────────────────────────────────────────────
 */
public final class FilePathUtils {

    private FilePathUtils() {
    }

    private static final Map<String, String> EXTENSIONS = Map.ofEntries(
            Map.entry("java", "java"),
            Map.entry("typescript", "ts"),
            Map.entry("javascript", "js"),
            Map.entry("python", "py"),
            Map.entry("html", "html"),
            Map.entry("css", "css"),
            Map.entry("scss", "scss"),
            Map.entry("sql", "sql"),
            Map.entry("json", "json"),
            Map.entry("markdown", "md"),
            Map.entry("prompt", "md"),
            Map.entry("kotlin", "kt"),
            Map.entry("rust", "rs"),
            Map.entry("go", "go"),
            Map.entry("csharp", "cs"),
            Map.entry("php", "php"),
            Map.entry("ruby", "rb"),
            Map.entry("swift", "swift"),
            Map.entry("bash", "sh"),
            Map.entry("shell", "sh"),
            Map.entry("dockerfile", "dockerfile"),
            Map.entry("yaml", "yml"),
            Map.entry("xml", "xml"),
            Map.entry("text", "txt")
    );

    public static String extensionFor(String language) {
        if (language == null) return "txt";
        return EXTENSIONS.getOrDefault(language.toLowerCase(), "txt");
    }

    public static String sanitiseTitle(String title) {
        if (title == null || title.isBlank()) return "Untitled";
        return title
                .trim()
                .replaceAll("[\\\\/:*?\"<>|]", "")
                .replaceAll("\\s+", "_")
                .replaceAll("\\.{2,}", ".")
                .replaceAll("^\\.", "")
                .substring(0, Math.min(title.length(), 80));
    }

    public static String relativePathFor(String folderName, String language, String title) {
        String dir = (folderName != null && !folderName.isBlank())
                ? sanitiseTitle(folderName) + "/" + (language == null ? "txt" : language.toLowerCase())
                : (language == null ? "txt" : language.toLowerCase());
        String filename = sanitiseTitle(title) + "." + extensionFor(language);
        return dir + "/" + filename;
    }
}