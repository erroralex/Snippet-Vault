/**
 * Defines the data structure representing a folder within the application.
 *
 * Folders are used to organize snippets hierarchically. Each folder can have an
 * optional parent folder, establishing a tree structure. It also includes visual
 * properties like color and icon for user customization, as well as a sorting order
 * and an expanded state for rendering the folder tree UI.
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
