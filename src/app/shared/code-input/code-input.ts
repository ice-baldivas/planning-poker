import { Component, ElementRef, forwardRef, QueryList, signal, ViewChildren } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const CODE_LENGTH = 6;

@Component({
  selector: 'app-code-input',
  templateUrl: './code-input.html',
  styleUrl: './code-input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CodeInputComponent),
      multi: true,
    },
  ],
})
export class CodeInputComponent implements ControlValueAccessor {
  readonly digitIndexes = Array.from({ length: CODE_LENGTH }, (_, i) => i);
  readonly digits = signal<string[]>(Array(CODE_LENGTH).fill(''));
  readonly disabled = signal(false);

  @ViewChildren('digitInput') private digitInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    const chars = (value ?? '').split('');
    this.digits.set(this.digitIndexes.map((i) => chars[i] ?? ''));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onInput(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const chars = target.value.replace(/\D/g, '').split('');

    if (!chars.length) {
      target.value = '';
      this.setDigit(index, '');
      return;
    }

    const next = [...this.digits()];
    let i = index;
    for (const char of chars) {
      if (i >= CODE_LENGTH) break;
      next[i] = char;
      i++;
    }
    target.value = next[index];
    this.digits.set(next);
    this.emitChange();
    this.focusDigit(Math.min(i, CODE_LENGTH - 1));
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      event.preventDefault();
      this.setDigit(index - 1, '');
      this.focusDigit(index - 1);
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusDigit(index - 1);
    } else if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault();
      this.focusDigit(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const chars = (event.clipboardData?.getData('text') ?? '')
      .replace(/\D/g, '')
      .split('')
      .slice(0, CODE_LENGTH);
    if (!chars.length) return;

    this.digits.set(this.digitIndexes.map((i) => chars[i] ?? ''));
    this.emitChange();
    this.focusDigit(Math.min(chars.length, CODE_LENGTH - 1));
  }

  onFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  private setDigit(index: number, value: string): void {
    const next = [...this.digits()];
    next[index] = value;
    this.digits.set(next);
    this.emitChange();
  }

  private focusDigit(index: number): void {
    queueMicrotask(() => this.digitInputs.get(index)?.nativeElement.focus());
  }

  private emitChange(): void {
    this.onChange(this.digits().join(''));
    this.onTouched();
  }
}
