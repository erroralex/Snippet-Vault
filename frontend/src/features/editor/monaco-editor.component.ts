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
        if (this.editor.getValue() !== currentSnippet.content) {
            this.updateEditorContent(currentSnippet);
        }
      }
    });
  }

  private initMonaco(): void {
    if (!this.editorContainer || !this.monaco) {
      return;
    }

    this.monaco.editor.defineTheme('gold-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        {token: '', foreground: 'e0e0e0', background: '121212'},
        {token: 'comment', foreground: '757575', fontStyle: 'italic'},
        {token: 'keyword', foreground: 'e69d67', fontStyle: 'bold'},
        {token: 'string', foreground: 'f0c27b'},
        {token: 'number', foreground: 'bd93f9'},
        {token: 'type', foreground: 'd4af37'},
        {token: 'class', foreground: '66bb6a'},
        {token: 'function', foreground: 'e69d67'},
        {token: 'variable', foreground: 'e0e0e0'},
        {token: 'operator', foreground: 'd4af37'},
        {token: 'annotation', foreground: 'f89820'},
        {token: 'tag', foreground: 'ff5e57'},
        {token: 'attribute', foreground: 'e69d67'},
      ],
      colors: {
        'editor.background': '#121212',
        'editor.foreground': '#e0e0e0',
        'editor.lineHighlightBackground': '#1a1a1a',
        'editor.selectionBackground': 'rgba(230, 157, 103, 0.15)',
        'editor.inactiveSelectionBackground': 'rgba(230, 157, 103, 0.08)',
        'editorLineNumber.foreground': '#333344',
        'editorLineNumber.activeForeground': '#e69d67',
        'editorCursor.foreground': '#e69d67',
        'editorWhitespace.foreground': '#1a1a2a',
        'editorIndentGuide.background1': '#1a1a2a',
        'editorIndentGuide.activeBackground1': '#333344',
        'editor.findMatchBackground': 'rgba(212, 175, 55, 0.25)',
        'editor.findMatchHighlightBackground': 'rgba(230, 157, 103, 0.12)',
        'scrollbarSlider.background': '#ffffff12',
        'scrollbarSlider.hoverBackground': '#ffffff22',
        'scrollbarSlider.activeBackground': 'rgba(230, 157, 103, 0.20)',
      }
    });

    this.editor = this.monaco.editor.create(this.editorContainer.nativeElement, {
      value: this.snippet().content || '',
      language: this.getMonacoLanguage(this.snippet().language || 'plaintext'),
      theme: 'gold-dark',
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
    this.destroy$.next();
    this.destroy$.complete();
    this.editor?.dispose();
  }
}
