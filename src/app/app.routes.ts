import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { RoomComponent } from './room/room';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'room/:id', component: RoomComponent },
  { path: '**', redirectTo: '' },
];
