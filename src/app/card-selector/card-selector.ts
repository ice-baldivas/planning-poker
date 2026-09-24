import { Component, effect, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-card-selector',
  imports: [],
  templateUrl: './card-selector.html',
  styleUrl: './card-selector.scss',
})
export class CardSelectorComponent {
  cards = input.required<string[]>();
  disabled = input<boolean>(false);
  resetRevision = input(0);

  selected = signal<string | null>(null);
  cardPicked = output<string>();

  constructor() {
    effect(() => {
      this.resetRevision();
      this.reset();
    });
  }

  selectCard(card: string): void {
    if (this.disabled()) return;
    this.selected.set(card);
    this.cardPicked.emit(card);
  }

  reset(): void {
    this.selected.set(null);
  }
}
