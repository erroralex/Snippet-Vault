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
 * A wrapper component that integrates the Monaco Editor into the Angular application.
 *
 * This component provides a robust code editing experience with syntax highlighting
 * based on the snippet's language. It dynamically loads the Monaco Editor library
 * to optimize initial bundle size and ensure compatibility with server-side rendering
 * (only loading in the browser). It features automatic saving with a debounce
 * mechanism to minimize API requests, a manual save shortcut (Ctrl+S), and visual
 * indicators for unsaved changes. It also includes a quick-copy button to easily
 * grab the snippet's code.
 */
@Component({
  selector: 'app-monaco-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-wrapper">
      <div class="editor-header" [style.border-bottom-color]="accentColor()">
        <span class="snippet-title">{{ snippet()?.title }}</span>
        <div class="header-right">
          <button
            class="copy-btn pressable"
            (click)="copyToClipboard()"
            [title]="copyLabel()">
            {{ copyLabel() }}
          </button>
          <span class="snippet-language" [style.color]="accentColor()">
            {{ snippet()?.language }}
          </span>
          @if (isDirty()) {
            <span class="dirty-dot"></span>
          } @else {
            <span class="saved-label">saved</span>
          }
        </div>
      </div>
      @if (snippet()?.filePath) {
        <div class="file-path-bar">
          <span class="file-path-icon">◫</span>
          <span class="file-path-text" [title]="snippet()?.filePath">
            {{ snippet()?.filePath }}
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
    languageColor(this.snippet()?.language ?? '', this.snippet()?.colorLabel)
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

    // Define the custom theme before creating the editor
    this.monaco.editor.defineTheme('neon-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '',           foreground: 'e0e0e0', background: '000000' },
        { token: 'comment',    foreground: '555566', fontStyle: 'italic' },
        { token: 'keyword',    foreground: '66fcf1', fontStyle: 'bold' },
        { token: 'string',     foreground: 'd870ff' },
        { token: 'number',     foreground: 'bd93f9' },
        { token: 'type',       foreground: '66fcf1' },
        { token: 'class',      foreground: '22c55e' },
        { token: 'function',   foreground: 'f1fa8c' },
        { token: 'variable',   foreground: 'e0e0e0' },
        { token: 'operator',   foreground: 'd870ff' },
        { token: 'annotation', foreground: 'f89820' },
        { token: 'tag',        foreground: 'ff5e57' },
        { token: 'attribute',  foreground: '66fcf1' },
      ],
      colors: {
        'editor.background':                  '#000000',
        'editor.foreground':                  '#e0e0e0',
        'editor.lineHighlightBackground':     '#0d0d0d',
        'editor.selectionBackground':         '#d870ff28',
        'editor.inactiveSelectionBackground': '#d870ff14',
        'editorLineNumber.foreground':        '#333344',
        'editorLineNumber.activeForeground':  '#66fcf1',
        'editorCursor.foreground':            '#66fcf1',
        'editorWhitespace.foreground':        '#1a1a2a',
        'editorIndentGuide.background1':      '#1a1a2a',
        'editorIndentGuide.activeBackground1':'#333344',
        'editor.findMatchBackground':         '#d870ff44',
        'editor.findMatchHighlightBackground':'#66fcf122',
        'scrollbarSlider.background':         '#ffffff12',
        'scrollbarSlider.hoverBackground':    '#ffffff22',
        'scrollbarSlider.activeBackground':   '#66fcf133',
      }
    });

    this.editor = this.monaco.editor.create(this.editorContainer.nativeElement, {
      value: this.snippet()?.content || '',
      language: this.getMonacoLanguage(this.snippet()?.language || 'plaintext'),
      theme: 'neon-dark',   // ← use the custom theme
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
