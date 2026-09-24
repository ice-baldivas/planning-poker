import { Component, computed, ElementRef, HostListener, input } from '@angular/core';
import { InfoToggleService } from './info-toggle.service';

@Component({
  selector: 'app-info-toggle',
  templateUrl: './info-toggle.html',
  styleUrl: './info-toggle.scss',
})
export class InfoToggleComponent {
  private static nextId = 0;

  readonly description = input.required<string>();
  readonly label = input.required<string>();
  readonly id = `info-toggle-${InfoToggleComponent.nextId++}`;
  readonly isOpen = computed(() => this.infoToggleService.openId() === this.id);

  constructor(
    private infoToggleService: InfoToggleService,
    private elementRef: ElementRef<HTMLElement>,
  ) {}

  toggle(): void {
    this.infoToggleService.toggle(this.id);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.infoToggleService.close(this.id);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.infoToggleService.close(this.id);
  }
}
