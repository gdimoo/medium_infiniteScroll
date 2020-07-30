import { LoadingSpinnerComponent } from './loading-spinner/loading-spinner.component';
import { PaginationService } from './pagination.service';
import { ScrollableDirective } from './scrollable.directive';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { environment } from 'src/environments/environment';
import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { CdkScrollableModule } from '@angular/cdk/scrolling';
import { ScrollingModule } from '@angular/cdk/scrolling';
@NgModule({
  declarations: [
    AppComponent,
    ScrollableDirective,
    LoadingSpinnerComponent
  ],
  imports: [
    BrowserModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFirestoreModule,
    CdkScrollableModule,
    ScrollingModule
  ],
  providers: [PaginationService],
  bootstrap: [AppComponent]
})
export class AppModule { }
