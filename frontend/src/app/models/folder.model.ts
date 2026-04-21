/**
 * ──────────────────────────────────────────────
 * <h2>Folder Model</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Defines the data structure representing a folder within the application.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Provides the type definition for a folder entity, facilitating hierarchical organization of snippets.</li>
 * <li>Specifies required properties such as unique identifier (ID) and name.</li>
 * <li>Supports nested structures via an optional {@code parentId}.</li>
 * <li>Includes visual customization properties like {@code color} and {@code icon}.</li>
 * <li>Maintains UI state properties like {@code sortOrder} and {@code expanded} status for rendering the folder tree.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> A TypeScript {@code interface} used as a Data Transfer Object (DTO) and state model throughout the frontend application, ensuring type safety when interacting with folder data.</p>
 * ──────────────────────────────────────────────
 */
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  color: string | null;
  icon: string;
  expanded: boolean;
}
