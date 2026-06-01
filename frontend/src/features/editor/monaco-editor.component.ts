import {
  Component,
  ViewChild,
  ElementRef,
  OnDestroy,
  inject,
  input,
  effect,
  afterNextRender,
  PLATFORM_ID,
  signal,
  computed,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { SnippetService, Snippet } from '../../core/service/snippet.service';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { languageColor } from '../../app/language-color';

type Monaco = typeof import('monaco-editor');

/**
 * ──────────────────────────────────────────────
 * <h2>MonacoEditorComponent</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Integrates the Monaco Editor into the Angular application, providing a professional-grade code editing experience.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Dynamically loads the Monaco Editor library to optimize initial bundle size and ensure Server-Side Rendering (SSR) compatibility.</li>
 * <li>Provides syntax highlighting based on the current snippet's language.</li>
 * <li>Implements a custom, programmatically defined editor theme that aligns with the application's overall design system.</li>
 * <li>Features an automatic saving mechanism with a debounce timer to minimize API requests during typing.</li>
 * <li>Supports manual save via a Ctrl+S keyboard shortcut.</li>
 * <li>Includes a quick-copy button and visual indicators for unsaved changes.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> An Angular {@code @Component} that acts as a wrapper around the imperative Monaco Editor API, managing its lifecycle, configuration, and data synchronization within the reactive Angular environment.</p>
 * ──────────────────────────────────────────────
 */
@Component({
  selector: 'app-monaco-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-wrapper">
      <div class="editor-header" [style.border-bottom-color]="accentColor()">
        <span class="snippet-title">{{ snippet().title }}</span>
        <div class="header-right">
          <button
            class="copy-btn pressable"
            (click)="copyToClipboard()"
            [title]="copyLabel()">
            {{ copyLabel() }}
          </button>
          <span class="snippet-language" [style.color]="accentColor()">
            {{ snippet().language }}
          </span>
          @if (isDirty()) {
            <span class="dirty-dot"></span>
          } @else {
            <span class="saved-label">saved</span>
          }
        </div>
      </div>
      @if (snippet().filePath) {
        <div class="file-path-bar">
          <span class="file-path-icon">◫</span>
          <span class="file-path-text" [title]="snippet().filePath">
            {{ snippet().filePath }}
          </span>
        </div>
      }
      <div #editorContainer class="monaco-editor-container"></div>
    </div>
  `,
  styleUrls: ['./monaco-editor.component.scss']
})
export class MonacoEditorComponent implements OnDestroy {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;

  snippet = input.required<Snippet>();

  private snippetService = inject(SnippetService);
  private platformId = inject(PLATFORM_ID);

  private destroy$ = new Subject<void>();
  isDirty = signal(false);
  copyLabel = signal('Copy');

  private monaco: Monaco | undefined;
  private editor: import('monaco-editor').editor.IStandaloneCodeEditor | undefined;
  private activeSnippetId: string | null = null;

  accentColor = computed(() =>
    languageColor(this.snippet().language ?? '', this.snippet().colorLabel)
  );

  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        import('monaco-editor').then(monaco => {
          this.monaco = monaco;
          this.initMonaco();
        }).catch(err => console.error('Error loading Monaco Editor:', err));
      }
    });

    effect(() => {
      const currentSnippet = this.snippet();
      if (this.editor && currentSnippet) {
        if (this.activeSnippetId && this.activeSnippetId !== currentSnippet.id && this.isDirty()) {
          this.saveSnippetSync(this.activeSnippetId, this.editor.getValue());
        }
        this.activeSnippetId = currentSnippet.id;
        if (this.editor.getValue() !== currentSnippet.content) {
            this.updateEditorContent(currentSnippet);
            this.isDirty.set(false);
        }
      }
    });

    effect(() => {
      const theme = this.snippetService.activeEditorTheme();
      if (this.editor && this.monaco) {
        this.monaco.editor.setTheme(theme);
      }
    });
  }

  private saveSnippetSync(id: string, content: string): void {
    this.snippetService.updateSnippet(id, content).subscribe({
      error: (err) => console.error('Failed to auto-save snippet on switch:', err)
    });
  }

  private initMonaco(): void {
    if (!this.editorContainer || !this.monaco) {
      return;
    }

    this.monaco.editor.defineTheme('intellij-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        {token: '', foreground: 'bcbec4', background: '1e1f22'},
        {token: 'comment', foreground: '7a7e85', fontStyle: 'italic'},
        {token: 'keyword', foreground: 'cf8e6d', fontStyle: 'bold'},
        {token: 'string', foreground: '6aab73'},
        {token: 'number', foreground: '2aacb8'},
        {token: 'type', foreground: 'c77dbb'},
        {token: 'class', foreground: 'c77dbb'},
        {token: 'function', foreground: '56a8f5'},
        {token: 'variable', foreground: 'bcbec4'},
        {token: 'operator', foreground: 'bcbec4'},
        {token: 'annotation', foreground: 'b3ae60'},
        {token: 'tag', foreground: 'd5b778'},
        {token: 'attribute', foreground: 'bcbec4'},
      ],
      colors: {
        'editor.background': '#1e1f22',
        'editor.foreground': '#bcbec4',
        'editor.lineHighlightBackground': '#26282e',
        'editor.selectionBackground': '#214283',
        'editor.inactiveSelectionBackground': 'rgba(33, 66, 131, 0.5)',
        'editorLineNumber.foreground': '#4e5157',
        'editorLineNumber.activeForeground': '#a1a3ab',
        'editorCursor.foreground': '#c6c6c6',
        'editorWhitespace.foreground': '#2d3139',
        'editorIndentGuide.background1': '#2b2d31',
        'editorIndentGuide.activeBackground1': '#4e5157',
        'editor.findMatchBackground': '#32593d',
        'editor.findMatchHighlightBackground': '#3e5245',
        'scrollbarSlider.background': '#ffffff0a',
        'scrollbarSlider.hoverBackground': '#ffffff15',
        'scrollbarSlider.activeBackground': '#ffffff25',
      }
    });

    this.monaco.editor.defineTheme('intellij-light', {
      base: 'vs',
      inherit: true,
      rules: [
        {token: '', foreground: '080808', background: 'ffffff'},
        {token: 'comment', foreground: '8c8c8c', fontStyle: 'italic'},
        {token: 'keyword', foreground: '0033b3', fontStyle: 'bold'},
        {token: 'string', foreground: '067d17'},
        {token: 'number', foreground: '1750eb'},
        {token: 'type', foreground: '000000'},
        {token: 'class', foreground: '000000'},
        {token: 'function', foreground: '00627a'},
        {token: 'variable', foreground: '080808'},
        {token: 'operator', foreground: '080808'},
        {token: 'annotation', foreground: '9e7a28'},
        {token: 'tag', foreground: '0033b3'},
        {token: 'attribute', foreground: '00627a'},
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#080808',
        'editor.lineHighlightBackground': '#f5f5f5',
        'editor.selectionBackground': '#a6d2ff',
        'editor.inactiveSelectionBackground': '#d0e8ff',
        'editorLineNumber.foreground': '#adadad',
        'editorLineNumber.activeForeground': '#1c1c1c',
        'editorCursor.foreground': '#000000',
        'editorWhitespace.foreground': '#d1d1d1',
        'editorIndentGuide.background1': '#ebecf0',
        'editorIndentGuide.activeBackground1': '#adadad',
        'editor.findMatchBackground': '#ffe79a',
        'editor.findMatchHighlightBackground': '#ffe79a',
        'scrollbarSlider.background': '#0000000a',
        'scrollbarSlider.hoverBackground': '#00000015',
        'scrollbarSlider.activeBackground': '#00000025',
      }
    });

    this.editor = this.monaco.editor.create(this.editorContainer.nativeElement, {
      value: this.snippet().content || '',
      language: this.getMonacoLanguage(this.snippet().language || 'plaintext'),
      theme: this.snippetService.activeEditorTheme(),
      automaticLayout: true,
      minimap: { enabled: false },
      readOnly: false,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
      fontSize: 13,
      lineHeight: 22,
      padding: { top: 12, bottom: 12 },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'gutter',
      cursorBlinking: 'phase',
      cursorSmoothCaretAnimation: 'on',
      mouseWheelZoom: true,
    });

    const contentChange$ = new Subject<void>();

    this.editor.onDidChangeModelContent(() => {
      this.isDirty.set(true);
      contentChange$.next();
    });

    contentChange$.pipe(
      debounceTime(1500),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.saveSnippet();
    });

    this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS, () => {
      contentChange$.complete();
      this.saveSnippet();
    });

    requestAnimationFrame(() => {
      this.editor?.layout();
    });
  }

  private updateEditorContent(snippet: Snippet): void {
    if (this.editor && this.monaco) {
      this.editor.setValue(snippet.content);
      this.monaco.editor.setModelLanguage(this.editor.getModel()!, this.getMonacoLanguage(snippet.language));
    }
  }

  private saveSnippet(): void {
    const currentSnippet = this.snippet();
    if (currentSnippet && this.editor) {
      const updatedContent = this.editor.getValue();
      this.snippetService.updateSnippet(currentSnippet.id, updatedContent).subscribe({
        next: () => this.isDirty.set(false),
        error: (err) => console.error('Failed to save snippet:', err)
      });
    }
  }

  copyToClipboard(): void {
    const content = this.editor?.getValue() ?? '';
    navigator.clipboard.writeText(content).then(() => {
      this.copyLabel.set('Copied!');
      setTimeout(() => this.copyLabel.set('Copy'), 1800);
    });
  }

  private getMonacoLanguage(lang: string): string {
    const map: Record<string, string> = {
      java: 'java', typescript: 'typescript', ts: 'typescript',
      javascript: 'javascript', js: 'javascript', python: 'python',
      py: 'python', html: 'html', css: 'css', scss: 'scss',
      json: 'json', xml: 'xml', markdown: 'markdown', md: 'markdown',
      sql: 'sql', go: 'go', kotlin: 'kotlin', kt: 'kotlin',
      rust: 'rust', csharp: 'csharp', cs: 'csharp', php: 'php',
      ruby: 'ruby', swift: 'swift', bash: 'shell', sh: 'shell',
      dockerfile: 'dockerfile', yaml: 'yaml', yml: 'yaml',
      prompt: 'markdown', text: 'plaintext',
    };
    return map[lang.toLowerCase()] ?? 'plaintext';
  }

  ngOnDestroy(): void {
    if (this.activeSnippetId && this.isDirty() && this.editor) {
      this.saveSnippetSync(this.activeSnippetId, this.editor.getValue());
    }
    this.destroy$.next();
    this.destroy$.complete();
    this.editor?.dispose();
  }
}
