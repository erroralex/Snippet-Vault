import {
  Component, input, inject, signal, effect, OnDestroy
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Subject} from 'rxjs';
import {debounceTime, takeUntil} from 'rxjs/operators';
import {Snippet, SnippetService} from '../core/service/snippet.service';

/**
 * ──────────────────────────────────────────────
 * <h2>DescriptionPaneComponent</h2>
 * ──────────────────────────────────────────────
 * <p><strong>Responsibility:</strong> Provides an integrated, auto-saving text area for viewing and editing the description or notes associated with a specific snippet.</p>
 * <p><strong>Functions:</strong></p>
 * <ul>
 * <li>Displays the current description text for the selected snippet.</li>
 * <li>Captures user input and triggers auto-saving functionality utilizing a debounce mechanism to reduce API calls.</li>
 * <li>Provides visual feedback to the user regarding the save state (e.g., 'unsaved', 'saved').</li>
 * <li>Intercepts the Tab key to insert spaces instead of moving focus away from the text area, facilitating basic formatting.</li>
 * </ul>
 * <p><strong>Technical Role:</strong> An Angular {@code @Component} that binds directly to a provided {@code Snippet} input, manages its own local edit state using Signals, and delegates persistence to the {@code SnippetService} via RxJS streams.</p>
 * ──────────────────────────────────────────────
 */
@Component({
  selector: 'app-description-pane',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="desc-pane">
      <div class="desc-header">
        <span class="desc-label">Description</span>
        @if (isDirty()) {
          <span class="desc-status dirty">unsaved</span>
        } @else {
          <span class="desc-status saved">saved</span>
        }
      </div>
      <textarea class="desc-textarea" [placeholder]="placeholder" [value]="localValue()" (input)="onInput($event)"
                (keydown.Tab)="onTab($event)" spellcheck="true"></textarea>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      flex-shrink: 0;
    }

    .desc-pane {
      display: flex;
      flex-direction: column;
      background: var(--bg-panel);
      backdrop-filter: var(--glass-blur);
      border-bottom: 1px solid var(--border-light);
    }

    .desc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 12px 4px;
      border-bottom: 1px solid var(--border-light);
    }

    .desc-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      font-weight: 600;
    }

    .desc-status {
      font-size: 10px;
    }

    .desc-status.dirty {
      color: var(--accent-secondary);
    }

    .desc-status.saved {
      color: var(--status-success);
    }

    .desc-textarea {
      width: 100%;
      min-height: 60px;
      max-height: 150px;
      resize: vertical;
      padding: 8px 12px;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-secondary);
      font-size: 13px;
      font-family: inherit;
      line-height: 1.6;
      caret-color: var(--accent-primary);

      &::placeholder {
        color: var(--text-muted);
        font-style: italic;
      }

      &:focus {
        color: var(--text-primary);
      }
    }
  `]
})
export class DescriptionPaneComponent implements OnDestroy {
  snippet = input.required<Snippet>();

  private snippetService = inject(SnippetService);
  private destroy$ = new Subject<void>();
  private changes$ = new Subject<string>();

  localValue = signal('');
  isDirty = signal(false);

  readonly placeholder = 'Add a description, usage notes, or context for this snippet…';

  constructor() {
    effect(() => {
      const s = this.snippet();
      this.localValue.set(s.description ?? '');
      this.isDirty.set(false);
    });

    this.changes$.pipe(
      debounceTime(1000),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.save(value);
    });
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.localValue.set(value);
    this.isDirty.set(true);
    this.changes$.next(value);
  }

  onTab(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    const ta = keyboardEvent.target as HTMLTextAreaElement;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newValue = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
    ta.value = newValue;
    ta.selectionStart = ta.selectionEnd = start + 2;
    this.localValue.set(newValue);
    this.isDirty.set(true);
    this.changes$.next(newValue);
  }

  private save(value: string): void {
    this.snippetService.updateDescription(this.snippet().id, value).subscribe({
      next: () => this.isDirty.set(false),
      error: (err: any) => console.error('Failed to save description:', err)
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
