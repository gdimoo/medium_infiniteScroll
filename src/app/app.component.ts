import { PaginationService } from './pagination.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit{

  constructor(public page: PaginationService<Array<object>>){}

  ngOnInit() {
    this.page.init('cats', 'name', { reverse: true, prepend: false })
  }

  scrollHandler(e) {
    if (e === 'bottom') {
      console.log('more');
      this.page.more()
    }
  }
}
