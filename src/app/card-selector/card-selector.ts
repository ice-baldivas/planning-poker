import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-card-selector',
  imports: [],
  templateUrl: './card-selector.html',
  styleUrl: './card-selector.scss',
})
export class CardSelectorComponent {
  cards = input.required<string[]>();
  disabled = input<boolean>(false);

  selected = signal<string | null>(null);
  cardPicked = output<string>();

  selectCard(card: string): void {
    if (this.disabled()) return;
    this.selected.set(card);
    this.cardPicked.emit(card);
  }

  reset(): void {
    this.selected.set(null);
  }
}
