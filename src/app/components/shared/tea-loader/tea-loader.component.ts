import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-tea-loader',
  standalone: true,
  templateUrl: './tea-loader.component.html',
  styleUrls: ['./tea-loader.component.scss']
})
export class TeaLoaderComponent {
  @Input() message = 'جاري تحضير البيانات...';
}
